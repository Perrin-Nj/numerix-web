import { JourneyScreen } from '@/features/play/JourneyScreen';

export default async function Page({ params }: { params: Promise<{ world: string }> }) {
  const { world } = await params;
  return <JourneyScreen world={world} />;
}
