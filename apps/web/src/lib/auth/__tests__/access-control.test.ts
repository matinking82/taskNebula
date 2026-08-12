/**
 * @jest-environment node
 */

const selectMock = jest.fn();

jest.mock('@tasknebula/db', () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
  issues: { id: 'issues.id' },
  users: { id: 'users.id', isSuperAdmin: 'users.isSuperAdmin' },
  organizationMembers: {
    id: 'organizationMembers.id',
    userId: 'organizationMembers.userId',
    organizationId: 'organizationMembers.organizationId',
    status: 'organizationMembers.status',
    role: 'organizationMembers.role',
  },
  projectMembers: {
    userId: 'projectMembers.userId',
    projectId: 'projectMembers.projectId',
    role: 'projectMembers.role',
    canBrowseProject: 'projectMembers.canBrowseProject',
    canAdministerProject: 'projectMembers.canAdministerProject',
    canAddComments: 'projectMembers.canAddComments',
    canEditIssues: 'projectMembers.canEditIssues',
  },
  projects: { id: 'projects.id', organizationId: 'projects.organizationId' },
  ROLE_DEFAULT_PERMISSIONS: {
    viewer: { canBrowseProject: true },
    developer: { canBrowseProject: true },
  },
  hasPermission: (role: string, permission: string) =>
    ['owner', 'admin'].includes(role) && permission === 'project:manage',
}));

jest.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ type: 'and', args }),
  eq: (left: unknown, right: unknown) => ({ type: 'eq', left, right }),
}));

import { canReadProject, resolvePermission } from '../access-control';

function rows(result: unknown[]) {
  const builder = {
    from: jest.fn(() => builder),
    where: jest.fn(() => builder),
    limit: jest.fn().mockResolvedValue(result),
  };
  return builder;
}

describe('resolvePermission', () => {
  it.each([
    [true, false, true],
    ['true', false, true],
    [false, true, false],
    ['false', true, false],
    [null, true, true],
    [undefined, false, false],
  ])('resolves %p with fallback %p to %p', (value, fallback, expected) => {
    expect(resolvePermission(value, fallback)).toBe(expected);
  });
});

describe('canReadProject active-membership boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not let a stale project membership survive organization removal', async () => {
    selectMock
      .mockReturnValueOnce(rows([{ isSuperAdmin: false }]))
      // Only active organization memberships are queried; no row means the
      // user was removed or suspended even if project_members still exists.
      .mockReturnValueOnce(rows([]));

    await expect(
      canReadProject('removed-user', {
        id: 'project-1',
        organizationId: 'org-1',
      } as never)
    ).resolves.toBe(false);

    expect(selectMock).toHaveBeenCalledTimes(2);
  });

  it('allows an active organization member with browse permission', async () => {
    selectMock
      .mockReturnValueOnce(rows([{ isSuperAdmin: false }]))
      .mockReturnValueOnce(rows([{ role: 'member' }]))
      .mockReturnValueOnce(rows([{ role: 'developer', canBrowseProject: 'true' }]));

    await expect(
      canReadProject('active-user', {
        id: 'project-1',
        organizationId: 'org-1',
      } as never)
    ).resolves.toBe(true);
  });

  it('honors an explicit browse denial over a permissive role default', async () => {
    selectMock
      .mockReturnValueOnce(rows([{ isSuperAdmin: false }]))
      .mockReturnValueOnce(rows([{ role: 'member' }]))
      .mockReturnValueOnce(rows([{ role: 'developer', canBrowseProject: 'false' }]));

    await expect(
      canReadProject('active-user', {
        id: 'project-1',
        organizationId: 'org-1',
      } as never)
    ).resolves.toBe(false);
  });

  it('can disable the global super-admin bypass for organization-bound credentials', async () => {
    selectMock.mockReturnValueOnce(rows([{ isSuperAdmin: true }])).mockReturnValueOnce(rows([]));

    await expect(
      canReadProject(
        'super-admin-key-owner',
        { id: 'project-1', organizationId: 'org-1' } as never,
        { allowSuperAdmin: false }
      )
    ).resolves.toBe(false);
  });
});
