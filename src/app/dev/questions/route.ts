import { NextResponse } from 'next/server';
import { requireQaAudit } from '@/dev/gate';
import { allSeeds } from '@/dev/qa-beat';

export const dynamic = 'force-dynamic';

export async function GET() {
  requireQaAudit();
  return NextResponse.json([...allSeeds().values()].map((q) => ({ id: q.id, world: q.world, grade: q.grade })));
}
