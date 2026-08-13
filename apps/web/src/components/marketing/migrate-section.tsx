import { Braces, FileSpreadsheet, GitBranch, Map } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SectionHeader, Shell } from './primitives';

/**
 * "Migrate from Jira / Linear" — conversion section for switchers.
 *
 * Server-safe (no client state or effects). It composes the shared landing primitives so it inherits
 * the page's container rhythm, typography, and `--landing-*` tokens. The source
 * cards reuse the importer's localized, capability-bounded copy so this surface
 * cannot drift into claiming unsupported migration depth.
 */
const sources: Array<{ icon: LucideIcon; tone: string; key: string }> = [
  {
    icon: Map,
    tone: 'blue',
    key: 'jira',
  },
  {
    icon: Braces,
    tone: 'violet',
    key: 'linear',
  },
  {
    icon: FileSpreadsheet,
    tone: 'cyan',
    key: 'csv',
  },
  {
    icon: GitBranch,
    tone: 'emerald',
    key: 'github',
  },
];

export function MigrateSection() {
  const publicT = useTranslations('publicPages');
  const pagesT = useTranslations('pagesSettings.import');
  const importT = useTranslations('settingsClients.import');

  return (
    <section id="migrate" className="border-t border-[var(--landing-border)]">
      <Shell className="py-20 sm:py-24">
        <SectionHeader
          kicker={importT('previewBadge')}
          kickerAccentVar="var(--landing-accent-violet)"
          title={publicT('setupImportTitle')}
          description={pagesT('subtitle')}
          compact
        />

        <div className="stagger mt-10 grid border-t border-[var(--landing-border)] sm:grid-cols-2">
          {sources.map(({ icon: Icon, tone, key }, index) => (
            <div
              key={key}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 border-b border-[var(--landing-border)] py-5 sm:px-5 sm:odd:border-e"
            >
              <div className="relative">
                <div className={`icon-tile icon-tile-accent-${tone} h-9 w-9`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span
                  className="mt-2 block text-center font-mono text-[9px] tabular-nums text-[var(--landing-text-muted)]"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <p className="text-[14px] font-[500] text-[var(--landing-text-dark)]">
                  {importT(`source.${key}.label`)}
                </p>
                <p className="mt-1.5 text-[13px] leading-6 text-[var(--landing-text-subtle)]">
                  {importT(`source.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Shell>
    </section>
  );
}
