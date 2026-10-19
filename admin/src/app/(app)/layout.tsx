'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useUI } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Button, Fox, cx } from '@/components/ui';
import { Toggles } from '@/components/toggles';
import type { Key } from '@/messages/fr';

const nav: { href: string; label: Key }[] = [
  { href: '/', label: 'nav.overview' },
  { href: '/parents', label: 'nav.parents' },
  { href: '/children', label: 'nav.children' },
  { href: '/questions', label: 'nav.questions' },
  { href: '/media', label: 'nav.media' },
  { href: '/plans', label: 'nav.plans' },
  { href: '/config', label: 'nav.config' },
  { href: '/notifications', label: 'nav.notifications' },
  { href: '/audit', label: 'nav.audit' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const t = useT();
  const { navOpen, setNav } = useUI();
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));

  async function logout() {
    await api('auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = '/login';
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      {navOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setNav(false)} aria-hidden />}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col gap-1 border-r border-line bg-elevated p-4 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Link href="/" className="mb-4 flex items-center gap-2" onClick={() => setNav(false)}>
          <Fox size={36} />
          <span className="font-display text-xl font-bold">Numerix</span>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Admin</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setNav(false)}
              aria-current={active(n.href) ? 'page' : undefined}
              className={cx('flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold', active(n.href) ? 'bg-brand-soft text-brand shadow-[inset_3px_0_0_var(--brand)]' : 'text-muted hover:bg-sunken hover:text-fg')}
            >
              {t(n.label)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 pt-4">
          <Toggles />
          <Button small onClick={logout}>
            {t('nav.logout')}
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur lg:hidden">
          <Button small onClick={() => setNav(true)} aria-label={t('nav.menu')}>
            {t('nav.menu')}
          </Button>
          <Fox size={28} />
          <span className="font-display font-bold">Numerix Admin</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
