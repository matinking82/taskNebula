'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BookOpenText,
  FolderKanban,
  Inbox,
  Layers,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useInbox } from '@/lib/hooks/use-inbox';
import { useOrganization } from '@/lib/hooks/use-organization';
import { useOrganizationPermissions, type Permission } from '@/lib/hooks/use-permissions';
import { stripLocalePrefix } from '@/components/layout/nav-paths';
import { UserProfileDropdown } from '@/components/user/user-profile-dropdown';

interface RailItem {
  name: string;
  href: string;
  icon: LucideIcon;
  showBadge?: boolean;
  requiredAnyPermissions?: Permission[];
}

// Rail items declare a translation key (resolved against `nav`) instead of
// inline English so the rail respects the user's chosen locale. The
// `href` stays language-agnostic; next-intl handles the `/[locale]` prefix
// at render time via `useTranslations('nav')`.
type RailItemKey = 'home' | 'inbox' | 'my_issues' | 'projects' | 'docs' | 'team' | 'settings';

const railItems: (Omit<RailItem, 'name'> & { key: RailItemKey })[] = [
  { key: 'home', href: '/dashboard', icon: LayoutDashboard },
  { key: 'inbox', href: '/inbox', icon: Inbox, showBadge: true },
  { key: 'my_issues', href: '/my-issues', icon: Layers },
  { key: 'projects', href: '/projects', icon: FolderKanban },
  { key: 'docs', href: '/docs', icon: BookOpenText },
  { key: 'team', href: '/team', icon: Users, requiredAnyPermissions: ['member:view', 'team:view'] },
  { key: 'settings', href: '/settings', icon: Settings },
];

export function AppRail({
  hasWorkspaceAccess = true,
  isSuperAdmin = false,
}: {
  hasWorkspaceAccess?: boolean;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const normalizedPathname = stripLocalePrefix(pathname);
  const tNav = useTranslations('nav');
  const tLayout = useTranslations('layoutNav');
  const { currentOrganizationId } = useOrganization();
  const { hasAny: hasAnyOrgPermission, isLoading: isLoadingOrgPermissions } =
    useOrganizationPermissions(currentOrganizationId ?? undefined);
  // Lightweight unread count — keys on { unread: true } so the response is
  // small (just unread items, first page). Refetches every minute via the
  // hook's `refetchInterval`.
  const { data: inboxUnread } = useInbox({
    unread: true,
    limit: 50,
    enabled: hasWorkspaceAccess,
  });
  const unreadInboxCount = inboxUnread?.items?.length ?? 0;
  const visibleRailItems = railItems.filter((item) => {
    if (!hasWorkspaceAccess) {
      return item.key === 'home' || item.key === 'settings';
    }
    if (!item.requiredAnyPermissions) {
      return true;
    }
    return !isLoadingOrgPermissions && hasAnyOrgPermission(item.requiredAnyPermissions);
  });

  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label={tLayout('workspaceRail')}
        className="workbench-rail flex h-dvh w-[52px] shrink-0 flex-col items-center border-e border-white/10 py-2"
      >
        <ul className="flex flex-1 flex-col items-center gap-1.5">
          {visibleRailItems.map((item) => {
            const label = tNav(item.key);
            const isActive =
              normalizedPathname === item.href ||
              normalizedPathname.startsWith(item.href + '/') ||
              (item.href === '/dashboard' &&
                (normalizedPathname === '/' ||
                  normalizedPathname.startsWith('/drafts') ||
                  normalizedPathname.startsWith('/templates'))) ||
              (item.href === '/my-issues' && normalizedPathname.startsWith('/issues/'));
            const Icon = item.icon;
            const showInboxBadge = item.showBadge && unreadInboxCount > 0;
            const unreadLabel = tNav('inbox_unread', { count: unreadInboxCount });

            return (
              <li key={item.key} className="w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      data-active={isActive ? 'true' : undefined}
                      aria-label={showInboxBadge ? `${label} · ${unreadLabel}` : label}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'ease-snap text-rail-foreground group relative mx-auto flex h-10 w-10 items-center justify-center rounded-md transition-[color,background-color,border-color,box-shadow,opacity] duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45',
                        isActive &&
                          'bg-white/[0.11] text-white hover:bg-white/[0.14] hover:text-white'
                      )}
                    >
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="bg-primary absolute inset-y-2 start-[-6px] w-0.5 rounded-e-sm"
                        />
                      ) : null}
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {showInboxBadge && (
                        <span
                          aria-hidden="true"
                          data-testid="inbox-unread-badge"
                          className="bg-primary text-primary-foreground absolute end-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-semibold ring-1 ring-white/20"
                        >
                          {unreadInboxCount > 9 ? '9+' : unreadInboxCount}
                        </span>
                      )}
                      <span className="sr-only">{label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {label}
                    {showInboxBadge ? ` · ${unreadLabel}` : ''}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>

        <div className="mt-1 flex flex-col items-center gap-1 pb-1">
          {isSuperAdmin ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin"
                  data-active={normalizedPathname.startsWith('/admin') ? 'true' : undefined}
                  aria-label={tNav('admin')}
                  className={cn(
                    'ease-snap text-rail-foreground group relative mx-auto flex h-10 w-10 items-center justify-center rounded-md transition-[color,background-color,border-color,box-shadow,opacity] duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45',
                    normalizedPathname.startsWith('/admin') &&
                      'bg-white/[0.11] text-white hover:bg-white/[0.14] hover:text-white'
                  )}
                >
                  {normalizedPathname.startsWith('/admin') ? (
                    <span
                      aria-hidden="true"
                      className="bg-primary absolute inset-y-2 start-[-6px] w-0.5 rounded-e-sm"
                    />
                  ) : null}
                  <Shield className="h-[18px] w-[18px] shrink-0" />
                  <span className="sr-only">{tNav('admin')}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{tNav('admin')}</TooltipContent>
            </Tooltip>
          ) : null}

          <UserProfileDropdown
            side="right"
            align="end"
            triggerClassName="group mx-auto h-8 w-8 rounded-full border-0 bg-transparent p-0 text-white ring-0 hover:bg-transparent hover:text-white focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-0"
            avatarClassName="h-8 w-8 rounded-full ring-1 ring-white/20 transition-colors duration-150 group-hover:ring-white/45"
            fallbackClassName="rounded-full bg-white/10 text-[11px] font-semibold text-white/90 ring-0 group-hover:bg-white/15 group-hover:text-white"
          />
        </div>
      </nav>
    </TooltipProvider>
  );
}

export default AppRail;
