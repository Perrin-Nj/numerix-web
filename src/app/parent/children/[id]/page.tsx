import { ChildOverview } from '@/features/parent/ChildOverview';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChildOverview childId={id} />;
}
