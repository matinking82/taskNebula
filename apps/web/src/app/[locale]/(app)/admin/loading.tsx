import { getTranslations } from 'next-intl/server';
import {
  Skeleton,
  SkeletonPageHeader,
  SkeletonStats,
  SkeletonTable,
} from '@/components/ui/skeleton';

export default async function AdminLoading() {
  const t = await getTranslations('pagesAdmin');

  return (
    <div className="custom-scrollbar flex h-full flex-col overflow-y-auto">
      <div className="space-y-6 px-6 py-6">
        <SkeletonPageHeader title={t('nav.overview')} />
        <SkeletonStats count={4} />
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
        <SkeletonTable rows={8} columns={5} />
      </div>
    </div>
  );
}
