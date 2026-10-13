import { ApiMode } from '@/features/common/ApiMode';
import { PageTransition } from '@/ui/page-transition';
import { MockTools } from '@/features/common/MockTools';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiMode mode="parent">
      <PageTransition>{children}</PageTransition>
      <MockTools />
    </ApiMode>
  );
}
