import { db, organizationMembers, projectMembers, projects, users } from '@tasknebula/db';
import { and, eq } from 'drizzle-orm';

function toBool(value: string | null | undefined) {
  return value === 'true';
}

export function resolveProjectAgentAccess(input: {
  isSuperAdmin: boolean;
  orgRole: 'owner' | 'admin' | 'member' | 'viewer' | 'guest' | null;
  projectMembership: {
    role: string;
    canBrowseProject: string;
    canAdministerProject: string;
    canManageSprints: string;
    canManageWorkflow: string;
  } | null;
}) {
  if (input.isSuperAdmin) return { canView: true, canManage: true };
  // A project-membership row is never an independent tenant grant. It becomes
  // effective only while the user retains active organization membership.
  if (!input.orgRole) return { canView: false, canManage: false };
  if (input.orgRole === 'owner' || input.orgRole === 'admin') {
    return { canView: true, canManage: true };
  }
  if (!input.projectMembership) return { canView: false, canManage: false };
  return {
    canView: toBool(input.projectMembership.canBrowseProject),
    canManage:
      toBool(input.projectMembership.canAdministerProject) ||
      toBool(input.projectMembership.canManageSprints) ||
      toBool(input.projectMembership.canManageWorkflow),
  };
}

export async function getOrgAgentAccess(userId: string, organizationId: string) {
  const [[user], [membership]] = await Promise.all([
    db
      .select({ isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, 'active')
        )
      )
      .limit(1),
  ]);

  const orgRole = membership?.role ?? null;
  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const canView = isSuperAdmin || !!orgRole;
  const canManage = isSuperAdmin || orgRole === 'owner' || orgRole === 'admin';

  return {
    canView,
    canManage,
    orgRole,
    isSuperAdmin,
  };
}

export async function getProjectAgentAccess(userId: string, projectId: string) {
  const [[project], [user]] = await Promise.all([
    db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
        name: projects.name,
        key: projects.key,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1),
    db
      .select({ isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  if (!project) {
    return {
      canView: false,
      canManage: false,
      isSuperAdmin: Boolean(user?.isSuperAdmin),
      orgRole: null,
      projectRole: null,
      project: null,
    };
  }

  if (user?.isSuperAdmin) {
    return {
      canView: true,
      canManage: true,
      isSuperAdmin: true,
      orgRole: 'owner' as const,
      projectRole: null,
      project,
    };
  }

  const [[orgMembership], [projectMembership]] = await Promise.all([
    db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, project.organizationId),
          eq(organizationMembers.status, 'active')
        )
      )
      .limit(1),
    db
      .select({
        role: projectMembers.role,
        canBrowseProject: projectMembers.canBrowseProject,
        canAdministerProject: projectMembers.canAdministerProject,
        canManageSprints: projectMembers.canManageSprints,
        canManageWorkflow: projectMembers.canManageWorkflow,
      })
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
      .limit(1),
  ]);

  const orgRole = orgMembership?.role ?? null;
  const projectRole = projectMembership?.role ?? null;
  const { canView, canManage } = resolveProjectAgentAccess({
    isSuperAdmin: false,
    orgRole,
    projectMembership: projectMembership ?? null,
  });

  return {
    canView,
    canManage,
    isSuperAdmin: false,
    orgRole,
    projectRole,
    project,
  };
}
