/**
 * Lets code outside React (query cache, event handlers) show visible errors.
 * Nothing is silent: errors raised before the reporter mounts are queued and shown when it registers.
 */
export type ReportOptions = { retry?: () => void };
type Reporter = (error: unknown, opts?: ReportOptions) => void;

let reporter: Reporter | null = null;
const queue: Array<[unknown, ReportOptions | undefined]> = [];

/**
 * Connects the visible error reporter (the notification center, mounted by ErrorBridge) and flushes errors
 * queued before it existed. Returns an unregister function that only clears this reporter.
 */
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

/**
 * Shows an error to the user from non-React code such as the query cache. Passes the optional retry callback to
 * the reporter, or queues the error and logs it until a reporter registers, so nothing is lost.
 */
export function reportError(error: unknown, opts?: ReportOptions) {
  if (reporter) reporter(error, opts);
  else {
    queue.push([error, opts]);
    console.error('[numerix] error queued until the notification center is ready', error);
  }
}
