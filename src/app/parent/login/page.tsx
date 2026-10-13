import { ApiMode } from '@/features/common/ApiMode';
import { AuthForm } from '@/features/auth/AuthForm';

export default function LoginPage() {
  return (
    <ApiMode mode="parent">
      <AuthForm mode="login" />
    </ApiMode>
  );
}
