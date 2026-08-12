/** @jest-environment node */

const mockAuth = jest.fn();
const mockSelect = jest.fn();
const mockTransaction = jest.fn();
const mockApplyBulk = jest.fn();

jest.mock('next/server', () => {
  class MockResponse {
    status: number;
    constructor(
      private readonly payload: unknown,
      init?: { status?: number }
    ) {
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.payload;
    }
    static json(payload: unknown, init?: { status?: number }) {
      return new MockResponse(payload, init);
    }
  }
  return { NextResponse: MockResponse };
});
jest.mock('@/auth', () => ({ auth: (...args: unknown[]) => mockAuth(...args) }));
jest.mock('@/lib/realtime/events', () => ({ publishEvent: jest.fn() }));
jest.mock('@/lib/labels/sync', () => ({ syncIssueLabelsBestEffort: jest.fn() }));
jest.mock('@/lib/workflows/issue-transition-policy', () => ({
  applyBulkIssueStatusTransitions: (...args: unknown[]) => mockApplyBulk(...args),
  isWorkflowTransitionError: (error: unknown) =>
    error instanceof Error && 'code' in error && 'httpStatus' in error,
  WorkflowTransitionError: class extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string) {
      super(code);
      this.code = code;
      this.httpStatus = code === 'workflow_transition_relationship_invalid' ? 400 : 404;
    }
  },
}));

jest.mock('@tasknebula/db', () => {
  const table = (name: string) =>
    new Proxy({ __name: name } as Record<string, string>, {
      get(target, property: string) {
        return target[property] ?? `${name}.${property}`;
      },
    });
  return {
    db: {
      select: (...args: unknown[]) => mockSelect(...args),
      transaction: (...args: unknown[]) => mockTransaction(...args),
    },
    issues: table('issues'),
    projects: table('projects'),
    sprints: table('sprints'),
    projectMembers: table('project_members'),
    organizationMembers: table('organization_members'),
    users: table('users'),
    createAuditLog: jest.fn(),
    hasPermission: () => false,
    ROLE_DEFAULT_PERMISSIONS: {
      developer: {
        canEditIssues: true,
        canDeleteIssues: true,
        canTransitionIssues: true,
        canAssignIssues: true,
        canScheduleIssues: true,
      },
      viewer: {
        canEditIssues: false,
        canDeleteIssues: false,
        canTransitionIssues: false,
        canAssignIssues: false,
        canScheduleIssues: false,
      },
    },
  };
});

jest.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ op: 'and', conditions }),
  eq: (left: unknown, right: unknown) => ({ op: 'eq', left, right }),
  inArray: (left: unknown, right: unknown[]) => ({ op: 'inArray', left, right }),
}));

import { POST } from './route';

function query(rows: Record<string, unknown>[]) {
  const chain = {
    from: (_table: unknown) => chain,
    where: (_condition: unknown) => chain,
    limit: (count: number) => Promise.resolve(rows.slice(0, count)),
    then: (
      resolve: (value: Record<string, unknown>[]) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

function request(body: unknown) {
  return { json: async () => body };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSelect.mockReset();
  mockTransaction.mockReset();
  mockApplyBulk.mockReset();
  mockAuth.mockResolvedValue({ user: { id: 'user-a' } });
});

it('requires transition permission for bulk status updates', async () => {
  mockSelect
    .mockReturnValueOnce(
      query([{ id: 'issue-a', projectId: 'project-a', organizationId: 'org-a' }])
    )
    .mockReturnValueOnce(query([{ isSuperAdmin: false }]))
    .mockReturnValueOnce(query([{ id: 'project-a', organizationId: 'org-a' }]))
    .mockReturnValueOnce(query([{ role: 'member' }]))
    .mockReturnValueOnce(
      query([
        {
          role: 'viewer',
          canTransitionIssues: 'false',
          canEditIssues: 'true',
        },
      ])
    );

  const response = await POST(
    request({
      action: 'update',
      issueIds: ['issue-a'],
      updates: { statusId: 'status-b' },
    }) as never
  );

  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({
    error: 'Insufficient permission to transition issues in one or more projects',
  });
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockApplyBulk).not.toHaveBeenCalled();
});

it('honors an explicit permission denial even when the project role default allows it', async () => {
  mockSelect
    .mockReturnValueOnce(
      query([{ id: 'issue-a', projectId: 'project-a', organizationId: 'org-a' }])
    )
    .mockReturnValueOnce(query([{ isSuperAdmin: false }]))
    .mockReturnValueOnce(query([{ id: 'project-a', organizationId: 'org-a' }]))
    .mockReturnValueOnce(query([{ role: 'member' }]))
    .mockReturnValueOnce(
      query([
        {
          role: 'developer',
          canEditIssues: 'false',
        },
      ])
    );

  const response = await POST(
    request({
      action: 'update',
      issueIds: ['issue-a'],
      updates: { priority: 'high' },
    }) as never
  );

  expect(response.status).toBe(403);
  expect(mockTransaction).not.toHaveBeenCalled();
});

function allowAsSuperAdmin(issueIds: string[]) {
  mockSelect
    .mockReturnValueOnce(
      query(issueIds.map((id) => ({ id, projectId: 'project-a', organizationId: 'org-a' })))
    )
    .mockReturnValueOnce(query([{ isSuperAdmin: true }]));
}

function transactionSelectQueue(queue: Record<string, unknown>[][]) {
  return {
    select: () => {
      const chain = query(queue.shift() ?? []);
      return Object.assign(chain, {
        for: (_mode: string) => chain,
      });
    },
    update: jest.fn(),
  };
}

it('rejects a cross-organization assignee before any bulk mutation', async () => {
  allowAsSuperAdmin(['issue-a']);
  mockTransaction.mockImplementationOnce(async (callback) =>
    callback(
      transactionSelectQueue([
        [{ issueId: 'issue-a', organizationId: 'org-a', projectId: 'project-a' }],
        [],
      ])
    )
  );

  const response = await POST(
    request({
      action: 'update',
      issueIds: ['issue-a'],
      updates: { assigneeId: 'user-from-org-b' },
    }) as never
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    code: 'workflow_transition_relationship_invalid',
  });
  expect(mockApplyBulk).not.toHaveBeenCalled();
});

it('rejects a sprint from another project before any bulk mutation', async () => {
  allowAsSuperAdmin(['issue-a']);
  mockTransaction.mockImplementationOnce(async (callback) =>
    callback(
      transactionSelectQueue([
        [{ issueId: 'issue-a', organizationId: 'org-a', projectId: 'project-a' }],
        [],
      ])
    )
  );

  const response = await POST(
    request({
      action: 'update',
      issueIds: ['issue-a'],
      updates: { sprintId: 'sprint-from-project-b' },
    }) as never
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    code: 'workflow_transition_relationship_invalid',
  });
  expect(mockApplyBulk).not.toHaveBeenCalled();
});

it('rejects when an issue leaves the authorized tenant/project scope before the transaction locks it', async () => {
  allowAsSuperAdmin(['issue-a']);
  const tx = transactionSelectQueue([
    [{ issueId: 'issue-a', organizationId: 'org-b', projectId: 'project-b' }],
  ]);
  mockTransaction.mockImplementationOnce(async (callback) => callback(tx));

  const response = await POST(
    request({
      action: 'update',
      issueIds: ['issue-a'],
      updates: { priority: 'high' },
    }) as never
  );

  expect(response.status).toBe(404);
  expect(tx.update).not.toHaveBeenCalled();
  expect(mockApplyBulk).not.toHaveBeenCalled();
});

it('rejects duplicate issue ids before authorization or mutation', async () => {
  const response = await POST(
    request({
      action: 'update',
      issueIds: ['issue-a', 'issue-a'],
      updates: { statusId: 'status-b' },
    }) as never
  );

  expect(response.status).toBe(400);
  expect(mockSelect).not.toHaveBeenCalled();
  expect(mockTransaction).not.toHaveBeenCalled();
});

it('rejects an empty update before authorization or mutation', async () => {
  const response = await POST(
    request({ action: 'update', issueIds: ['issue-a'], updates: {} }) as never
  );

  expect(response.status).toBe(400);
  expect(mockSelect).not.toHaveBeenCalled();
  expect(mockTransaction).not.toHaveBeenCalled();
});

it('rejects an empty status id before authorization or mutation', async () => {
  const response = await POST(
    request({ action: 'update', issueIds: ['issue-a'], updates: { statusId: '' } }) as never
  );

  expect(response.status).toBe(400);
  expect(mockSelect).not.toHaveBeenCalled();
  expect(mockTransaction).not.toHaveBeenCalled();
});

it('rejects more than 100 issue ids before authorization or mutation', async () => {
  const response = await POST(
    request({
      action: 'update',
      issueIds: Array.from({ length: 101 }, (_, index) => `issue-${index}`),
      updates: { priority: 'high' },
    }) as never
  );

  expect(response.status).toBe(400);
  expect(mockSelect).not.toHaveBeenCalled();
  expect(mockTransaction).not.toHaveBeenCalled();
});
