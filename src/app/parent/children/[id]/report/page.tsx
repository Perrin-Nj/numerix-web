import { ReportScreen } from '@/features/parent/ReportScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportScreen childId={id} />;
}
