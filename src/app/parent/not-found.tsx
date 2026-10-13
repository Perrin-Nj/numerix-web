import { ErrorScreen } from '@/game/error-screen';

// Area (play, parent, root) comes from the URL, so one file serves every unmatched route.
export default function NotFound() {
  return <ErrorScreen kind="notfound" />;
}
