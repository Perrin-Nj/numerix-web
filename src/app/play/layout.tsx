import { ApiMode } from '@/features/common/ApiMode';
import { PageTransition } from '@/ui/page-transition';
import { PlayShell } from '@/features/play/PlayShell';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiMode mode="child">
      <PlayShell>
        <PageTransition>{children}</PageTransition>
      </PlayShell>
    </ApiMode>
  );
}
