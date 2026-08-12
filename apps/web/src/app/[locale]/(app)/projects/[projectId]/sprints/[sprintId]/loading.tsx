import { getTranslations } from 'next-intl/server';
import { Skeleton, SkeletonStats, SkeletonKanbanColumn } from '@/components/ui/skeleton';

export default async function SprintDetailLoading() {
  const t = await getTranslations('pagesProjects');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h1 className="sr-only">{t('loadingSprint')}</h1>
      <div className="border-border shrink-0 space-y-3 border-b px-6 py-4">
        <Skeleton className="h-6 w-64" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="px-6 pt-4">
        <SkeletonStats count={4} />
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-4">
        <div className="flex h-full gap-3">
          <SkeletonKanbanColumn cards={3} />
          <SkeletonKanbanColumn cards={2} />
          <SkeletonKanbanColumn cards={4} />
          <SkeletonKanbanColumn cards={2} />
        </div>
      </div>
    </div>
  );
}
