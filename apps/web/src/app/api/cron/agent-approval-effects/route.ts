/**
 * POST /api/cron/agent-approval-effects
 *
 * Reconciles durable post-commit effects created by approved agent actions.
 * The worker leases rows, retries failures with backoff and reclaims abandoned
 * leases, so an application restart cannot strand a committed approval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/agents/cron-auth';
import { processApprovalEffectOutbox } from '@/lib/agent-policy/approval-effects';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  let limit = DEFAULT_BATCH_SIZE;
  try {
    const body = (await request.json()) as { limit?: unknown };
    if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
      limit = Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(body.limit)));
    }
  } catch {
    // An empty body is valid.
  }

  const summary = await processApprovalEffectOutbox({ limit });
  return NextResponse.json({ ok: true, ...summary });
}
