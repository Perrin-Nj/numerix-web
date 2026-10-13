import {
  AlertTriangle,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Download,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Globe,
  Heart,
  Home,
  Info,
  Lock,
  LogOut,
  Map,
  Monitor,
  Moon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const REGISTRY = {
  lock: Lock,
  check: Check,
  play: Play,
  pause: Pause,
  star: Star,
  flame: Flame,
  sparkles: Sparkles,
  volume: Volume2,
  'volume-off': VolumeX,
  settings: Settings,
  user: User,
  users: Users,
  plus: Plus,
  x: X,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  home: Home,
  book: BookOpen,
  trophy: Trophy,
  refresh: RefreshCw,
  'wifi-off': WifiOff,
  alert: AlertTriangle,
  info: Info,
  eye: Eye,
  'eye-off': EyeOff,
  moon: Moon,
  sun: Sun,
  globe: Globe,
  'log-out': LogOut,
  shield: Shield,
  trash: Trash2,
  download: Download,
  map: Map,
  heart: Heart,
  bookmark: Bookmark,
  contrast: Contrast,
  monitor: Monitor,
  gift: Gift,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof REGISTRY;
export const ICON_NAMES = Object.keys(REGISTRY) as IconName[];

export type IconProps = {
  name: IconName;
  size?: number;
  /** Decorative by default. Pass a title to expose it to assistive tech. */
  title?: string;
  className?: string;
};

export function Icon({ name, size = 20, title, className }: IconProps) {
  const Cmp = REGISTRY[name];
  return (
    <Cmp
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    />
  );
}
