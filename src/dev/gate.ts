import { notFound } from 'next/navigation';

/** Dev-only routes: they exist only when QA_RENDER_AUDIT=1 is set when the server runs. Production builds never set it. */
export function requireQaAudit() {
  if (process.env.QA_RENDER_AUDIT !== '1') notFound();
}
