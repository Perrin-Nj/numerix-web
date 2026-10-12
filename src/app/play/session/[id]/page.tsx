import { StoryScreen } from '@/features/play/StoryScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryScreen sessionId={id} />;
}
