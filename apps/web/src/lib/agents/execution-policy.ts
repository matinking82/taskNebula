import type { AgentRunKind, AiOversightMode } from './config';

export type AgentWriteDisposition =
  | 'read_only'
  | 'preview_requested'
  | 'preview_writes_disabled'
  | 'preview_approval_required'
  | 'live';

export interface AgentExecutionPolicy {
  dryRun: boolean;
  forcedDryRun: boolean;
  writeCapable: boolean;
  approvalRequired: boolean;
  disposition: AgentWriteDisposition;
}

const WRITE_CAPABLE_KINDS = new Set<AgentRunKind>(['backlog_triage', 'bulk_sprint_creation']);

/**
 * Fail-closed policy shared by project-agent entry points. Until the durable
 * approval/apply worker exists, approval-gated runs produce a preview and zero
 * writes instead of silently bypassing human oversight.
 */
export function resolveAgentExecutionPolicy(input: {
  kind: AgentRunKind;
  requestedDryRun: boolean;
  allowWriteActions: boolean;
  requireApprovalForWrites: boolean;
  aiOversight: AiOversightMode;
}): AgentExecutionPolicy {
  const writeCapable = WRITE_CAPABLE_KINDS.has(input.kind);
  const approvalRequired =
    writeCapable && (input.requireApprovalForWrites || input.aiOversight === 'review_required');

  if (!writeCapable) {
    return {
      dryRun: input.requestedDryRun,
      forcedDryRun: false,
      writeCapable: false,
      approvalRequired: false,
      disposition: 'read_only',
    };
  }
  if (input.requestedDryRun) {
    return {
      dryRun: true,
      forcedDryRun: false,
      writeCapable: true,
      approvalRequired,
      disposition: 'preview_requested',
    };
  }
  if (!input.allowWriteActions) {
    return {
      dryRun: true,
      forcedDryRun: true,
      writeCapable: true,
      approvalRequired,
      disposition: 'preview_writes_disabled',
    };
  }
  if (approvalRequired) {
    return {
      dryRun: true,
      forcedDryRun: true,
      writeCapable: true,
      approvalRequired: true,
      disposition: 'preview_approval_required',
    };
  }
  return {
    dryRun: false,
    forcedDryRun: false,
    writeCapable: true,
    approvalRequired: false,
    disposition: 'live',
  };
}
