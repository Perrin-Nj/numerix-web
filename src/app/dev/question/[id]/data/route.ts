import { NextResponse } from 'next/server';
import { requireQaAudit } from '@/dev/gate';
import { qaBeat } from '@/dev/qa-beat';
import { stageInputs, stageKind } from '@/features/play/stageChoice';

export const dynamic = 'force-dynamic';

/** The beat of a question plus what the stage will draw in each phase (same helpers as the play screen). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  requireQaAudit();
  const beat = qaBeat(decodeURIComponent((await params).id));
  if (!beat) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const q = beat.question;
  const { showCounting } = stageInputs(q);
  const base = { hasScene: false, hasBeat: true, showHow: false, hasMethodVisual: false, hasVisual: Boolean(q.visual), showCounting };
  return NextResponse.json({ ...beat, stage: { question: stageKind({ ...base, outcomeStage: false }), reveal: stageKind({ ...base, outcomeStage: true }) } });
}
