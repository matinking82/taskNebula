import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Github } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DOCKER_HUB_URL,
  GITHUB_URL,
  Kicker,
  Shell,
  focusRingClass,
  primaryCtaClass,
  secondaryCtaClass,
} from './primitives';

const proofLinks = [
  {
    key: 'sourceGithub',
    href: GITHUB_URL,
  },
  {
    key: 'mitLicensed',
    href: `${GITHUB_URL}/blob/main/LICENSE`,
  },
  {
    key: 'dockerImage',
    href: DOCKER_HUB_URL,
  },
] as const;

export function Hero() {
  const t = useTranslations('publicPages.landing.hero');
  const proof = useTranslations('publicPages.landing.proof');

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative border-b border-[var(--landing-border)]"
    >
      <Shell className="flex py-14 sm:py-20 lg:min-h-[calc(100svh-4rem)] lg:items-center lg:py-24">
        <div className="grid w-full gap-14 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="animate-fade-up lg:col-span-8 xl:col-span-9">
            <Kicker label={t('kicker')} accentVar="var(--landing-accent-blue)" />
            <h1
              id="landing-hero-title"
              className="landing-display mt-7 max-w-5xl text-balance text-[40px] text-[var(--landing-text-dark)] min-[390px]:text-[46px] sm:text-[62px] lg:text-[72px] xl:text-[82px]"
            >
              {t.rich('title', {
                accent: (chunks) => (
                  <span className="text-[var(--landing-accent-blue)]">{chunks}</span>
                ),
              })}
            </h1>
            <p className="landing-body mt-6 max-w-2xl text-[15px] text-[var(--landing-text-subtle)] sm:text-[18px]">
              {t('description')}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 min-[390px]:flex-row min-[390px]:items-center">
              <Link
                href="/auth/signup"
                className={`${primaryCtaClass} justify-between min-[390px]:justify-center`}
              >
                {t('createWorkspace')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${secondaryCtaClass} justify-between min-[390px]:justify-center`}
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                {t('viewGithub')}
              </a>
            </div>
          </div>

          <aside
            aria-label={proof('aria')}
            className="border-y border-[var(--landing-border-strong)] bg-[var(--landing-bg-surface)] px-4 py-6 lg:col-span-4 lg:border-y-0 lg:border-s lg:bg-transparent lg:px-0 lg:pb-1 lg:ps-8 lg:pt-0 xl:col-span-3"
          >
            <p className="max-w-sm text-[13px] font-[500] leading-5 text-[var(--landing-text-dark)]">
              {proof('headline')}
            </p>
            <p className="mt-1 max-w-sm text-[12px] leading-5 text-[var(--landing-text-subtle)]">
              {proof('subline')}
            </p>

            <ol className="mt-6 border-t border-[var(--landing-border)]">
              {proofLinks.map((item, index) => (
                <li key={item.key} className="border-b border-[var(--landing-border)]">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex min-h-11 items-center gap-3 rounded-sm py-2 text-[12px] text-[var(--landing-text-body)] transition-colors duration-150 hover:text-[var(--landing-text-dark)] ${focusRingClass}`}
                  >
                    <span
                      className="font-mono text-[10px] tabular-nums text-[var(--landing-text-muted)]"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1">{proof(`items.${item.key}`)}</span>
                    <ArrowUpRight
                      className="ease-snap h-3.5 w-3.5 text-[var(--landing-text-muted)] transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ol>

            <p className="mt-5 border-s border-[var(--landing-border-strong)] ps-3 text-[11px] leading-5 text-[var(--landing-text-subtle)]">
              {t('selfHostMeta')}
            </p>
          </aside>
        </div>
      </Shell>
    </section>
  );
}
