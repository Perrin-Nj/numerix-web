import { RecapScreen } from '@/features/parent/RecapScreen';

export default async function Page({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  return <RecapScreen childId={id} sessionId={sid} />;
}
