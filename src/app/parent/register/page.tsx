import { ApiMode } from '@/features/common/ApiMode';
import { AuthForm } from '@/features/auth/AuthForm';

export default function RegisterPage() {
  return (
    <ApiMode mode="parent">
      <AuthForm mode="register" />
    </ApiMode>
  );
}
