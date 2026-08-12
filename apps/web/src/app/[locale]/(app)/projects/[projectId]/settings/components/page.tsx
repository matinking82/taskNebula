import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { ProjectAccessDenied } from '@/components/projects/project-access-denied';
import { resolveProjectCapabilityAccess } from '@/lib/auth/project-access';
import { ComponentsManager } from '@/components/settings/components-manager';

export default async function ProjectComponentsSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/projects/${projectId}/settings/components`);
  }

  const access = await resolveProjectCapabilityAccess(session.user.id, projectId);
  const canAccess =
    access.canRead &&
    (access.canManage || access.isSuperAdmin || access.isOrgOwner || access.isOrgAdmin);

  if (!canAccess) {
    return <ProjectAccessDenied />;
  }

  const t = await getTranslations('settings.components');

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-8">
      <h1 className="sr-only">{t('title')}</h1>
      <ComponentsManager projectId={projectId} />
    </div>
  );
}
