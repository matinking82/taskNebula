/**
 * POST /api/webhooks/agent-session/[provider]
 *
 * Linear Agent Protocol receiver. The provider POSTs an
 * AgentSessionEvent here when its session changes state. We:
 *
 *   1. Verify the HMAC signature against the per-session secret (preferred)
 *      or the provider's shared `hmac_secret`. Signatures must be valid; if
 *      neither matches we 401 and never touch the row.
 *   2. Parse the event with the AgentSessionEventSchema. Schema errors return
 *      400 so misbehaving providers learn fast.
 *   3. Reduce the state machine. Invalid transitions are dropped with a 200
 *      so the provider doesn't retry forever; the row stays put.
 *   4. Atomically claim a durable fingerprint receipt, update the
 *      `agent_sessions` row and create the downstream DB effects.
 *   5. Post a short comment on the linked issue ("Cursor started", "Devin
 *      completed PR #42 → <url>"). The comment is created as the virtual
 *      agent user when one is configured.
 *   6. If the event reports terminal completion, transition the issue to the
 *      first `in_review` (when a PR is attached) or `done` workflow status.
 *
 * The route is intentionally permissive about extra fields — providers add
 * metadata over time and we don't want to force a redeploy on every change.
 */

import { createHash } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { NextRequest, NextResponse } from 'next/server';
import {
  agentSessionWebhookDeliveries,
  agentSessions,
  agentProviders,
  db,
  eq,
  issues,
  issueComments,
  workflows,
  workflowStatuses,
  and,
  users,
} from '@tasknebula/db';
import {
  AGENT_PROVIDERS,
  AgentSessionEventSchema,
  nextSessionState,
  renderAgentComment,
  type AgentProviderKind,
  type AgentSessionEvent,
  type AgentSessionState,
  verifyAgentSignature,
  isTerminalState,
} from '@/lib/agents/sessions';
import { childLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = childLogger('api/webhooks/agent-session');
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function isValidProvider(value: string): value is AgentProviderKind {
  return (AGENT_PROVIDERS as readonly string[]).includes(value);
}

interface VerificationResult {
  ok: boolean;
  session: typeof agentSessions.$inferSelect | null;
  reason?: string;
}

async function loadSessionFromHeaders(
  request: NextRequest,
  provider: AgentProviderKind
): Promise<typeof agentSessions.$inferSelect | null> {
  const sessionId = request.headers.get('x-tasknebula-session-id');
  if (!sessionId) return null;
  const [row] = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.id, sessionId))
    .limit(1);
  return row && row.provider === provider ? row : null;
}

async function loadSessionFromEvent(
  event: AgentSessionEvent,
  provider: AgentProviderKind
): Promise<typeof agentSessions.$inferSelect | null> {
  if (event.sessionId) {
    const [row] = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, event.sessionId))
      .limit(1);
    if (row && row.provider === provider) return row;
  }
  if (event.externalId) {
    const [row] = await db
      .select()
      .from(agentSessions)
      .where(
        and(eq(agentSessions.externalId, event.externalId), eq(agentSessions.provider, provider))
      )
      .limit(1);
    if (row) return row;
  }
  return null;
}

async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  session: typeof agentSessions.$inferSelect | null,
  workspaceId: string | null,
  provider: AgentProviderKind
): Promise<VerificationResult> {
  if (!signatureHeader) {
    return { ok: false, session, reason: 'Missing signature header' };
  }

  // Prefer the per-session secret — it's tighter scoped (one session, one
  // recipient) and is rotated with each dispatch.
  if (session && verifyAgentSignature(rawBody, signatureHeader, session.signedSecret)) {
    return { ok: true, session };
  }

  // Fall back to the workspace provider's shared secret. We only consult it
  // when we know which workspace the session belongs to; for sessionless
  // payloads (e.g. probe webhooks) this branch is skipped.
  if (workspaceId) {
    const [providerRow] = await db
      .select()
      .from(agentProviders)
      .where(
        and(eq(agentProviders.workspaceId, workspaceId), eq(agentProviders.provider, provider))
      )
      .limit(1);
    if (providerRow && verifyAgentSignature(rawBody, signatureHeader, providerRow.hmacSecret)) {
      return { ok: true, session };
    }
  }

  return { ok: false, session, reason: 'Bad signature' };
}

async function findAgentUser(
  tx: DbTransaction,
  provider: AgentProviderKind
): Promise<string | null> {
  const [agent] = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAgent, true), eq(users.agentProvider, provider)))
    .limit(1);
  return agent?.id ?? null;
}

async function maybeTransitionIssueOnComplete(
  tx: DbTransaction,
  issueId: string,
  organizationId: string,
  event: AgentSessionEvent
): Promise<void> {
  // Look up the org's default workflow.
  const [workflow] = await tx
    .select()
    .from(workflows)
    .where(and(eq(workflows.organizationId, organizationId), eq(workflows.isDefault, true)))
    .limit(1);
  if (!workflow) return;

  const statuses = await tx
    .select()
    .from(workflowStatuses)
    .where(eq(workflowStatuses.workflowId, workflow.id));

  // If the agent attached a PR, move to in_review; otherwise mark done.
  const targetCategory: 'in_review' | 'done' = event.pullRequest?.url ? 'in_review' : 'done';

  const candidates = statuses
    .filter((s) => s.category === targetCategory)
    .sort((a, b) => a.position - b.position);
  const target = candidates[0];
  if (!target) return;

  await tx
    .update(issues)
    .set({ statusId: target.id, updatedAt: new Date() })
    .where(and(eq(issues.id, issueId), eq(issues.organizationId, organizationId)));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  if (!isValidProvider(providerParam)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }
  const provider = providerParam;

  const rawBody = await request.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = AgentSessionEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid AgentSessionEvent', details: parsed.error.errors },
      { status: 400 }
    );
  }
  const event = parsed.data;

  // Locate the session first so we can use its workspace for fallback HMAC.
  const session =
    (await loadSessionFromHeaders(request, provider)) ??
    (await loadSessionFromEvent(event, provider));

  // We need an issue to derive workspace; if no session is known yet we treat
  // the call as unverifiable (the dispatch endpoint always supplies a row).
  let workspaceId: string | null = null;
  if (session) {
    const [issueRow] = await db
      .select({ organizationId: issues.organizationId })
      .from(issues)
      .where(eq(issues.id, session.issueId))
      .limit(1);
    workspaceId = issueRow?.organizationId ?? null;
  }

  const signatureHeader =
    request.headers.get('x-tasknebula-signature') ||
    request.headers.get('x-agent-signature') ||
    request.headers.get('linear-signature');

  const verdict = await verifySignature(rawBody, signatureHeader, session, workspaceId, provider);
  if (!verdict.ok || !session) {
    return NextResponse.json(
      { error: verdict.reason ?? 'Unable to locate session' },
      { status: 401 }
    );
  }

  const requestedState = event.state;
  const eventFingerprint = createHash('sha256').update(rawBody).digest('hex');
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unable to resolve session workspace' }, { status: 401 });
  }

  type DeliveryDecision =
    | { kind: 'duplicate'; state: AgentSessionState }
    | { kind: 'dropped'; state: AgentSessionState; reason: string }
    | { kind: 'accepted'; state: AgentSessionState };

  let decision: DeliveryDecision;
  try {
    decision = await db.transaction<DeliveryDecision>(async (tx) => {
      const deliveryId = createId();
      const [delivery] = await tx
        .insert(agentSessionWebhookDeliveries)
        .values({
          id: deliveryId,
          workspaceId,
          sessionId: session.id,
          provider,
          fingerprint: eventFingerprint,
          eventState: requestedState,
          payload: event,
          status: 'processing',
        })
        .onConflictDoNothing()
        .returning({ id: agentSessionWebhookDeliveries.id });

      // The tenant/session/fingerprint unique index is the durable concurrency
      // gate. PostgreSQL waits for an in-flight conflicting insert, so only the
      // transaction that owns this receipt may perform downstream side effects.
      if (!delivery) {
        const [latest] = await tx
          .select({ state: agentSessions.state })
          .from(agentSessions)
          .where(and(eq(agentSessions.id, session.id), eq(agentSessions.provider, provider)))
          .limit(1);
        return {
          kind: 'duplicate',
          state: (latest?.state ?? session.state) as AgentSessionState,
        };
      }

      const [lockedSession] = await tx
        .select()
        .from(agentSessions)
        .where(and(eq(agentSessions.id, session.id), eq(agentSessions.provider, provider)))
        .limit(1)
        .for('update');
      if (!lockedSession) throw new Error('agent_session_disappeared');

      const currentState = lockedSession.state as AgentSessionState;
      if (currentState === requestedState && isTerminalState(currentState)) {
        await tx
          .update(agentSessionWebhookDeliveries)
          .set({ status: 'dropped', completedAt: new Date() })
          .where(
            and(
              eq(agentSessionWebhookDeliveries.id, delivery.id),
              eq(agentSessionWebhookDeliveries.workspaceId, workspaceId)
            )
          );
        return { kind: 'duplicate', state: currentState };
      }

      const newState = nextSessionState(currentState, requestedState);
      if (!newState) {
        const reason = `Invalid transition ${currentState} -> ${requestedState}`;
        await tx
          .update(agentSessionWebhookDeliveries)
          .set({ status: 'dropped', completedAt: new Date(), lastError: reason })
          .where(
            and(
              eq(agentSessionWebhookDeliveries.id, delivery.id),
              eq(agentSessionWebhookDeliveries.workspaceId, workspaceId)
            )
          );
        return { kind: 'dropped', state: currentState, reason };
      }

      const storedPayload =
        typeof lockedSession.payload === 'object' && lockedSession.payload !== null
          ? (lockedSession.payload as Record<string, unknown>)
          : {};
      const mergedPayload = { ...storedPayload, lastEvent: event };

      const [updatedSession] = await tx
        .update(agentSessions)
        .set({
          state: newState,
          externalId: event.externalId ?? lockedSession.externalId,
          payload: mergedPayload,
          updatedAt: new Date(),
          finishedAt: isTerminalState(newState) ? new Date() : null,
        })
        .where(and(eq(agentSessions.id, session.id), eq(agentSessions.state, currentState)))
        .returning({ state: agentSessions.state });
      if (!updatedSession) {
        // This protects against non-webhook writers that do not take the row
        // lock. The receipt remains durable but is explicitly marked dropped.
        const reason = 'Concurrent session update won';
        await tx
          .update(agentSessionWebhookDeliveries)
          .set({ status: 'dropped', completedAt: new Date(), lastError: reason })
          .where(
            and(
              eq(agentSessionWebhookDeliveries.id, delivery.id),
              eq(agentSessionWebhookDeliveries.workspaceId, workspaceId)
            )
          );
        return { kind: 'dropped', state: currentState, reason };
      }

      // Every downstream effect in this receiver is database-only, so keep it
      // in the same transaction as the receipt and session CAS. A crash before
      // commit rolls back the fingerprint and lets the provider safely retry;
      // a committed receipt means the comment/transition committed too.
      const [issue] = await tx
        .select()
        .from(issues)
        .where(and(eq(issues.id, lockedSession.issueId), eq(issues.organizationId, workspaceId)))
        .limit(1);
      if (!issue) throw new Error('agent_session_issue_not_found');

      const agentUserId = (await findAgentUser(tx, provider)) ?? issue.reporterId;
      await tx.insert(issueComments).values({
        id: createId(),
        issueId: lockedSession.issueId,
        content: renderAgentComment(provider, newState, event),
        mentions: [],
        reactions: [],
        isInternal: 'false',
        createdBy: agentUserId,
        updatedBy: agentUserId,
      });

      if (newState === 'complete') {
        await maybeTransitionIssueOnComplete(
          tx,
          lockedSession.issueId,
          issue.organizationId,
          event
        );
      }

      await tx
        .update(agentSessionWebhookDeliveries)
        .set({ status: 'completed', completedAt: new Date(), lastError: null })
        .where(
          and(
            eq(agentSessionWebhookDeliveries.id, delivery.id),
            eq(agentSessionWebhookDeliveries.workspaceId, workspaceId),
            eq(agentSessionWebhookDeliveries.status, 'processing')
          )
        );

      return { kind: 'accepted', state: newState };
    });
  } catch (err) {
    log.error({ err, sessionId: session.id }, 'agent-session atomic delivery failed');
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  if (decision.kind === 'duplicate') {
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      state: decision.state,
      dropped: true,
      duplicate: true,
    });
  }
  if (decision.kind === 'dropped') {
    // Drop invalid transitions but don't make the provider retry forever.
    log.warn(
      { sessionId: session.id, state: decision.state, reason: decision.reason },
      'dropping invalid agent-session transition'
    );
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      state: decision.state,
      dropped: true,
      reason: decision.reason,
    });
  }

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    state: decision.state,
  });
}
