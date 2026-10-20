import { z } from 'zod';

const serverSchema = z.object({
  API_URL: z.url().default('http://localhost:8081/v1'),
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
