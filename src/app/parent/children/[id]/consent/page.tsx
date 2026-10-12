import { ConsentScreen } from '@/features/parent/ConsentScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConsentScreen childId={id} />;
}
