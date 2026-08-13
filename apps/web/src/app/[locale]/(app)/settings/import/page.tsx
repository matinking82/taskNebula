import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db, organizationMembers, projects } from '@tasknebula/db';
import { and, asc, eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { requirePermission } from '@/lib/auth/permissions';
import { ImportWizard } from './import-wizard';
import { PageFrame } from '@/components/ui/page-frame';
import { PageHeader } from '@/components/ui/page-header';

export async function generateMetadata() {
  const t = await getTranslations('pagesSettings');
  return { title: t('import.metaTitle') };
}

/**
 * Settings → Import page.
 *
 * Renders the source picker + adapter-specific form. Auth and membership
 * are enforced here so the client never needs to know about workspace
 * resolution.
 */
export default async function ImportSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/settings/import');
  }

  const [primaryOrg] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.userId, session.user.id), eq(organizationMembers.status, 'active'))
    )
    .limit(1);

  if (!primaryOrg) {
    redirect('/dashboard?error=insufficient-permission');
  }

  await requirePermission(primaryOrg.organizationId, 'org:settings');

  const targetProjects = await db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
    })
    .from(projects)
    .where(eq(projects.organizationId, primaryOrg.organizationId))
    .orderBy(asc(projects.name));

  const t = await getTranslations('pagesSettings');

  return (
    <PageFrame contentClassName="max-w-5xl">
      <PageHeader title={t('import.title')} description={t('import.subtitle')} />
      <ImportWizard workspaceId={primaryOrg.organizationId} projects={targetProjects} />
    </PageFrame>
  );
}
