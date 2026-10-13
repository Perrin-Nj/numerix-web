'use client';
import { RouteError } from '@/game/error-screen';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />;
}
