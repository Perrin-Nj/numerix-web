import { z } from 'zod';

const serverSchema = z.object({
  API_URL: z.url().default('http://localhost:8081/v1').refine((value) => {
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
});

/** Server-only (zod stays out of the browser bundle). Never import from a client component. */
export function serverEnv() {
  const parsed = serverSchema.safeParse({ API_URL: process.env.API_URL });
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server configuration. Fix .env or Vercel variables:\n${lines}`);
  }
  return parsed.data;
}
