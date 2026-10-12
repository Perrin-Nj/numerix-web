import { ApiMode } from '@/features/common/ApiMode';
import { MockTools } from '@/features/common/MockTools';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiMode mode="parent">
      {children}
      <MockTools />
    </ApiMode>
  );
}
