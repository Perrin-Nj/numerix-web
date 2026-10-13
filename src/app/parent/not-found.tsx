import { ErrorScreen } from '@/ui/error-screen';

// Area (play, parent, root) comes from the URL, so one file serves every unmatched route.
export default function NotFound() {
  return <ErrorScreen kind="notfound" />;
}
