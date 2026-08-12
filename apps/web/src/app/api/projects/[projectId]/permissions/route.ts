import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  db,
  projectMembers,
  organizationMembers,
  users,
  eq,
  and,
  ROLE_DEFAULT_PERMISSIONS,
  hasPermission as roleHasPermission,
  type ProjectRole,
  type GranularPermissions,
} from '@tasknebula/db';
import { resolveProjectByIdOrKey } from '@/lib/projects/server';
import { canReadProject } from '@/lib/auth/access-control';
import { resolveProjectMemberPermission } from '@/lib/projects/member-permissions';

// Full permissions interface with all granular permissions
export interface UserProjectPermissions extends GranularPermissions {
  isMember: boolean;
  role: ProjectRole | null;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
}

// All permissions set to true (for super admin / org-wide project manager)
const ALL_PERMISSIONS: GranularPermissions = {
  canBrowseProject: true,
  canAdministerProject: true,
  canBrowseDocs: true,
  canCreateDocs: true,
  canEditDocs: true,
  canDeleteDocs: true,
  canBrowseChat: true,
  canCreateChannels: true,
  canPostMessages: true,
  canModerateMessages: true,
  canStartCalls: true,
  canManageCalls: true,
  canManageSprints: true,
  canStartSprint: true,
  canCompleteSprint: true,
  canDeleteSprint: true,
  canCreateIssues: true,
  canEditIssues: true,
  canEditOwnIssues: true,
  canDeleteIssues: true,
  canDeleteOwnIssues: true,
  canAssignIssues: true,
  canAssigneeIssues: true,
  canTransitionIssues: true,
  canScheduleIssues: true,
  canMoveIssues: true,
  canLinkIssues: true,
  canCloseIssues: true,
  canReopenIssues: true,
  canAddComments: true,
  canEditOwnComments: true,
  canEditAllComments: true,
  canDeleteOwnComments: true,
  canDeleteAllComments: true,
  canCreateAttachments: true,
  canDeleteOwnAttachments: true,
  canDeleteAllAttachments: true,
  canManageWatchers: true,
  canViewWatchers: true,
  canManageMembers: true,
  canInviteMembers: true,
  canRemoveMembers: true,
  canChangeRoles: true,
  canManageWorkflow: true,
  canLogWork: true,
  canEditOwnWorklogs: true,
  canEditAllWorklogs: true,
  canDeleteOwnWorklogs: true,
  canDeleteAllWorklogs: true,
};

// No permissions (for non-members)
const NO_PERMISSIONS: GranularPermissions = {
  canBrowseProject: false,
  canAdministerProject: false,
  canBrowseDocs: false,
  canCreateDocs: false,
  canEditDocs: false,
  canDeleteDocs: false,
  canBrowseChat: false,
  canCreateChannels: false,
  canPostMessages: false,
  canModerateMessages: false,
  canStartCalls: false,
  canManageCalls: false,
  canManageSprints: false,
  canStartSprint: false,
  canCompleteSprint: false,
  canDeleteSprint: false,
  canCreateIssues: false,
  canEditIssues: false,
  canEditOwnIssues: false,
  canDeleteIssues: false,
  canDeleteOwnIssues: false,
  canAssignIssues: false,
  canAssigneeIssues: false,
  canTransitionIssues: false,
  canScheduleIssues: false,
  canMoveIssues: false,
  canLinkIssues: false,
  canCloseIssues: false,
  canReopenIssues: false,
  canAddComments: false,
  canEditOwnComments: false,
  canEditAllComments: false,
  canDeleteOwnComments: false,
  canDeleteAllComments: false,
  canCreateAttachments: false,
  canDeleteOwnAttachments: false,
  canDeleteAllAttachments: false,
  canManageWatchers: false,
  canViewWatchers: false,
  canManageMembers: false,
  canInviteMembers: false,
  canRemoveMembers: false,
  canChangeRoles: false,
  canManageWorkflow: false,
  canLogWork: false,
  canEditOwnWorklogs: false,
  canEditAllWorklogs: false,
  canDeleteOwnWorklogs: false,
  canDeleteAllWorklogs: false,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId: projectIdOrKey } = await params;
    const project = await resolveProjectByIdOrKey(projectIdOrKey, session.user.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const canRead = await canReadProject(session.user.id, project);
    if (!canRead) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectId = project.id;

    // Check if user is super admin
    const [user] = await db
      .select({ isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const isSuperAdmin = user?.isSuperAdmin || false;

    // Get organization membership
    const [orgMember] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, project.organizationId),
          eq(organizationMembers.status, 'active')
        )
      )
      .limit(1);

    const isOrgOwner = orgMember?.role === 'owner';
    const isOrgAdmin = orgMember?.role === 'admin' || isOrgOwner;
    const hasOrgProjectManagement = roleHasPermission(
      orgMember?.role || '',
      'project:manage',
      isSuperAdmin
    );

    // Get project membership with ALL permission columns
    const [projectMember] = await db
      .select()
      .from(projectMembers)
      .where(
        and(eq(projectMembers.userId, session.user.id), eq(projectMembers.projectId, projectId))
      )
      .limit(1);

    // Super admin or org roles with project:manage have full project access.
    if (hasOrgProjectManagement) {
      return NextResponse.json({
        isMember: true,
        role: (projectMember?.role as ProjectRole) || 'product_owner',
        isSuperAdmin,
        isOrgOwner,
        isOrgAdmin,
        ...ALL_PERMISSIONS,
      } as UserProjectPermissions);
    }

    // Not a member - no access
    if (!projectMember) {
      return NextResponse.json({
        isMember: false,
        role: null,
        isSuperAdmin,
        isOrgOwner,
        isOrgAdmin,
        ...NO_PERMISSIONS,
      } as UserProjectPermissions);
    }

    // Get role-based default permissions
    const roleDefaults =
      ROLE_DEFAULT_PERMISSIONS[projectMember.role as ProjectRole] ||
      ROLE_DEFAULT_PERMISSIONS.viewer;

    const permission = (key: keyof GranularPermissions): boolean =>
      resolveProjectMemberPermission(projectMember[key], roleDefaults[key]);

    // Build permissions from database values (custom overrides) or role defaults
    const permissions: UserProjectPermissions = {
      isMember: true,
      role: projectMember.role as ProjectRole,
      isSuperAdmin,
      isOrgOwner,
      isOrgAdmin,
      // Project
      canBrowseProject: permission('canBrowseProject'),
      canAdministerProject: permission('canAdministerProject'),
      canBrowseDocs: permission('canBrowseDocs'),
      canCreateDocs: permission('canCreateDocs'),
      canEditDocs: permission('canEditDocs'),
      canDeleteDocs: permission('canDeleteDocs'),
      canBrowseChat: permission('canBrowseChat'),
      canCreateChannels: permission('canCreateChannels'),
      canPostMessages: permission('canPostMessages'),
      canModerateMessages: permission('canModerateMessages'),
      canStartCalls: permission('canStartCalls'),
      canManageCalls: permission('canManageCalls'),
      // Sprint
      canManageSprints: permission('canManageSprints'),
      canStartSprint: permission('canStartSprint'),
      canCompleteSprint: permission('canCompleteSprint'),
      canDeleteSprint: permission('canDeleteSprint'),
      // Issue
      canCreateIssues: permission('canCreateIssues'),
      canEditIssues: permission('canEditIssues'),
      canEditOwnIssues: permission('canEditOwnIssues'),
      canDeleteIssues: permission('canDeleteIssues'),
      canDeleteOwnIssues: permission('canDeleteOwnIssues'),
      canAssignIssues: permission('canAssignIssues'),
      canAssigneeIssues: permission('canAssigneeIssues'),
      canTransitionIssues: permission('canTransitionIssues'),
      canScheduleIssues: permission('canScheduleIssues'),
      canMoveIssues: permission('canMoveIssues'),
      canLinkIssues: permission('canLinkIssues'),
      canCloseIssues: permission('canCloseIssues'),
      canReopenIssues: permission('canReopenIssues'),
      // Comment
      canAddComments: permission('canAddComments'),
      canEditOwnComments: permission('canEditOwnComments'),
      canEditAllComments: permission('canEditAllComments'),
      canDeleteOwnComments: permission('canDeleteOwnComments'),
      canDeleteAllComments: permission('canDeleteAllComments'),
      // Attachment
      canCreateAttachments: permission('canCreateAttachments'),
      canDeleteOwnAttachments: permission('canDeleteOwnAttachments'),
      canDeleteAllAttachments: permission('canDeleteAllAttachments'),
      // Watcher
      canManageWatchers: permission('canManageWatchers'),
      canViewWatchers: permission('canViewWatchers'),
      // Member
      canManageMembers: permission('canManageMembers'),
      canInviteMembers: permission('canInviteMembers'),
      canRemoveMembers: permission('canRemoveMembers'),
      canChangeRoles: permission('canChangeRoles'),
      // Workflow
      canManageWorkflow: permission('canManageWorkflow'),
      // Time Tracking
      canLogWork: permission('canLogWork'),
      canEditOwnWorklogs: permission('canEditOwnWorklogs'),
      canEditAllWorklogs: permission('canEditAllWorklogs'),
      canDeleteOwnWorklogs: permission('canDeleteOwnWorklogs'),
      canDeleteAllWorklogs: permission('canDeleteAllWorklogs'),
    };

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching project permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
