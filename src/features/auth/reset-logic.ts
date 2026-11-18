/** Pure rules for the password reset screen. No React, no browser globals. */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
export const CODE_LENGTH = 8;

/** Keeps only the digits of what the parent typed or pasted ("1234-5678", "1234 5678"), at most 8. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** Shows digits as NNNN-NNNN while typing. */
export function formatCode(digits: string): string {
  const d = normalizeCode(digits);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

export const isCodeComplete = (input: string) => normalizeCode(input).length === CODE_LENGTH;

export type PasswordProblem = 'short' | 'long';

/** The password policy: 10 to 128 characters. Null when the password is fine. */
export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN) return 'short';
  if (password.length > PASSWORD_MAX) return 'long';
  return null;
}

/** Minutes to show for a "try again later" message. Null when the service gave no wait. */
export function waitMinutes(seconds: number | undefined): number | null {
  return seconds && seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : null;
}
