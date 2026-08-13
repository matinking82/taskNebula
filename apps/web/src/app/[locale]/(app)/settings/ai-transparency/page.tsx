import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db, organizationMembers } from '@tasknebula/db';
import { and, eq } from 'drizzle-orm';
import { hasPermission } from '@/lib/auth/permissions';
import { AiTransparencyClient } from './ai-transparency-client';
import { PageFrame } from '@/components/ui/page-frame';

export default async function AiTransparencyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/settings/ai-transparency');
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

  if (!(await hasPermission(primaryOrg.organizationId, 'org:settings'))) {
    redirect('/dashboard?error=insufficient-permission');
  }

  return (
    <PageFrame contentClassName="max-w-5xl">
      <AiTransparencyClient organizationId={primaryOrg.organizationId} />
    </PageFrame>
  );
}
