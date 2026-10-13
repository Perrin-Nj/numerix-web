'use client';
import { useEffect } from 'react';

// Last resort: the root layout itself failed, so no providers or translations exist here.
const COPY = {
  fr: { title: 'Oups, un petit accroc', text: 'Quelque chose a mal tourné chez nous. Réessaie ou retourne à l\'accueil.', retry: 'Réessayer', home: 'Retour à l\'accueil', details: 'Détails techniques', code: 'Code' },
  en: { title: 'Oops, a little bump', text: 'Something went wrong on our side. Try again or go home.', retry: 'Try again', home: 'Go home', details: 'Technical details', code: 'Code' },
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'fr';
  const c = COPY[lang];
  useEffect(() => console.error('[numerix] global error', error), [error]);
  const btn = { minHeight: 56, padding: '0 24px', fontSize: 18, borderRadius: 12, fontWeight: 600, border: '2px solid #888', cursor: 'pointer' } as const;
  return (
    <html lang={lang}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff9f0', color: '#14111f' }}>
        <main role="alert" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 tabIndex={-1} ref={(el) => el?.focus()} style={{ fontSize: 32, margin: 0 }}>{c.title}</h1>
          <p style={{ fontSize: 18, margin: 0, maxWidth: 420 }}>{c.text}</p>
          <button type="button" onClick={reset} style={{ ...btn, background: '#6c47ff', color: '#fff', borderColor: '#6c47ff' }}>{c.retry}</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be broken here */}
          <a href="/" style={{ ...btn, display: 'inline-flex', alignItems: 'center', background: 'transparent', color: 'inherit', textDecoration: 'none' }}>{c.home}</a>
          <details style={{ fontSize: 14 }}>
            <summary>{c.details}</summary>
            <p>{c.code}: {error.digest ?? 'unknown'}</p>
          </details>
        </main>
      </body>
    </html>
  );
}
