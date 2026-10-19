import { cn } from '@/shared/cn';

export type SkeletonProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  shape?: 'line' | 'block' | 'circle';
};

const SHAPE = {
  line: 'h-4 w-full rounded-sm',
  block: 'h-24 w-full rounded-md',
  circle: 'size-12 rounded-full',
} as const;

/** Placeholder shape shown while content loads. */
export function Skeleton({ className, width, height, shape = 'line' }: SkeletonProps) {
  return <div aria-hidden className={cn('nx-skeleton', SHAPE[shape], className)} style={{ width, height }} />;
}
