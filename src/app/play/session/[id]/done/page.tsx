import { DoneScreen } from '@/features/play/DoneScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoneScreen sessionId={id} />;
}
