import { ApiMode } from '@/features/common/ApiMode';
import { MeScreen } from '@/features/play/MeScreen';

export default function Page() {
  return (
    <ApiMode mode="child">
      <MeScreen />
    </ApiMode>
  );
}
