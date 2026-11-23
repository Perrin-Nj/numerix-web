import { requireQaAudit } from '@/dev/gate';
import { qaBeat } from '@/dev/qa-beat';
import { notFound } from 'next/navigation';
import { QaQuestionClient } from '@/dev/QaClient';

export const dynamic = 'force-dynamic';

/** /dev/question/<id>?phase=question|reveal : one bank question drawn like the play screen (render audit, dev only). */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ phase?: string }> }) {
  requireQaAudit();
  const { id } = await params;
  const beat = qaBeat(decodeURIComponent(id));
  if (!beat) notFound();
  const { phase } = await searchParams;
  return <QaQuestionClient beat={beat} phase={phase === 'reveal' ? 'reveal' : 'question'} qaAll={process.env.QA_SCENES_ALL === '1'} />;
}
