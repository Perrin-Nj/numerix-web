import type { Metadata } from 'next';
import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function ForgotPage() {
  return <ForgotPasswordScreen />;
}
