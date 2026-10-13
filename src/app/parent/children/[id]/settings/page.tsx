import { SettingsScreen } from '@/features/parent/SettingsScreen';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SettingsScreen childId={id} />;
}
