import { ApiMode } from '@/features/common/ApiMode';
import { ProfilePicker } from '@/features/play/ProfilePicker';

// The profile picker lists children, which needs the parent session
export default function Page() {
  return (
    <ApiMode mode="parent">
      <ProfilePicker />
    </ApiMode>
  );
}
