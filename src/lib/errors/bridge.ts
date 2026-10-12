/**
 * Lets code outside React (query cache, event handlers) show visible errors.
 * Nothing is silent: errors raised before the reporter mounts are queued and shown when it registers.
 */
export type ReportOptions = { retry?: () => void };
type Reporter = (error: unknown, opts?: ReportOptions) => void;

let reporter: Reporter | null = null;
const queue: Array<[unknown, ReportOptions | undefined]> = [];

export function registerReporter(fn: Reporter) {
  reporter = fn;
  while (queue.length) {
    const [e, o] = queue.shift()!;
    fn(e, o);
  }
  return () => {
    if (reporter === fn) reporter = null;
  };
}

export function reportError(error: unknown, opts?: ReportOptions) {
  if (reporter) reporter(error, opts);
  else {
    queue.push([error, opts]);
    console.error('[numerix] error queued until the notification center is ready', error);
  }
}
