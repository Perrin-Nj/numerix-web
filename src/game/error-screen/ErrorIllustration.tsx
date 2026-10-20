import { cn } from '@/shared/cn';
import { Mascot, type MascotPose } from '@/game/mascot';
import type { ErrorKind } from './classify';

const POSE: Record<ErrorKind, MascotPose> = { notfound: 'curious', offline: 'sad', timeout: 'sleepy', permission: 'think', generic: 'sad' };

/** Numa is the only character, so an error shows her (no drawn scene). Decorative: the title says what happened. */
export function ErrorIllustration({ kind, className }: { kind: ErrorKind; className?: string }) {
  return (
    <span aria-hidden className={cn('flex justify-center', className)}>
      <Mascot pose={POSE[kind]} size="md" decorative />
    </span>
  );
}
