/** Pure rules for the password reset screens. No React, no browser globals. */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
const TOKEN_MAX = 1024;

/** Reads the reset token from a URL fragment such as "#token=abc". Null when it is missing or not usable. */
export function parseTokenFragment(hash: string): string | null {
  for (const part of hash.replace(/^#/, '').split('&')) {
    if (!part.startsWith('token=')) continue;
    let value = part.slice('token='.length);
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep the raw value: the server decides if it is valid */
    }
    value = value.trim();
    return value && value.length <= TOKEN_MAX && !/\s/.test(value) ? value : null;
  }
  return null;
}

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
