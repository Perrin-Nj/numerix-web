import { ApiMode } from '@/features/common/ApiMode';
import { MockTools } from '@/features/common/MockTools';
import { PlayShell } from '@/features/play/PlayShell';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiMode mode="child">
      <PlayShell>{children}</PlayShell>
      <MockTools />
    </ApiMode>
  );
}
