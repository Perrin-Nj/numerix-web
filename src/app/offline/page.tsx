'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { ErrorScreen } from '@/ui/error-screen';

// Served by the service worker when a page cannot be loaded without a connection
const offline = new ApiError(0, 'device_offline', 'Device offline');

export default function OfflinePage() {
  const router = useRouter();
  useEffect(() => {
    document.title = 'Offline | Numerix';
  }, []);
  return <ErrorScreen error={offline} area="play" onRetry={() => (navigator.onLine ? router.push('/play/home') : window.location.reload())} />;
}
