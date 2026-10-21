import { z } from 'zod';

const schema = z.object({
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_SESSION_SECRET: z.string().min(32),
  PLATFORM_API_URL: z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || (
        url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      );
    } catch (error) {
      if (error instanceof TypeError) return false;
      throw error;
    }
  }, 'must use HTTPS except for a trusted loopback API'),
  ADMIN_API_TOKEN: z.string().min(16),
});

let cached: z.infer<typeof schema> | null = null;

/** Parsed lazily so `next build` works without secrets. Throws a readable error when misconfigured. */
export function env() {
  if (cached) return cached;
  const r = schema.safeParse(process.env);
  if (!r.success) {
    const keys = r.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid server env: ${keys}. See .env.example`);
  }
  cached = r.data;
  return cached;
}
