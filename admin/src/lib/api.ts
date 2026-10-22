export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

/** Browser calls always go to this app's own /api/*; the session cookie rides along. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: init?.method ?? 'GET',
      headers: { ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}), ...init?.headers },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError('network_error', 0);
  }
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('auth')) {
    window.location.href = '/login';
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = data as { message?: string; error?: string; detail?: string } | null;
    throw new ApiError(d?.message ?? d?.error ?? d?.detail ?? `HTTP ${res.status}`, res.status, data);
  }
  return emptyListsToArrays(data) as T;
}

// The Go API answers `null` for an empty list (a nil slice). Pages call .map/.filter on these, so turn them into [].
const LIST_KEYS = ['items', 'quests', 'worlds'];
function emptyListsToArrays(data: unknown): unknown {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    for (const k of LIST_KEYS) if (k in o && o[k] === null) o[k] = [];
  }
  return data;
}

export const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const asList = <T,>(x: T[] | { items: T[] } | null | undefined): T[] => (Array.isArray(x) ? x : (x?.items ?? []));
