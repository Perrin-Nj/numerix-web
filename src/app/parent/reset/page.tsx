import type { Metadata } from 'next';
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen';

// No search listing, and no Referer header on anything this page opens
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function ResetPage() {
  return <ResetPasswordScreen />;
}
