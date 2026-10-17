import { ApiMode } from '@/features/common/ApiMode';
import { PageTransition } from '@/ui/page-transition';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiMode mode="parent">
      <PageTransition>{children}</PageTransition>
    </ApiMode>
  );
}
