import { describe, expect, it } from 'vitest';
import { formatCode, isCodeComplete, normalizeCode, passwordProblem, waitMinutes } from './reset-logic';

describe('code', () => {
  it('keeps digits only', () => {
    expect(normalizeCode('1234-5678')).toBe('12345678');
    expect(normalizeCode(' 1234 5678 ')).toBe('12345678');
    expect(normalizeCode('12ab34')).toBe('1234');
  });
  it('caps at 8 digits', () => expect(normalizeCode('1234567890')).toBe('12345678'));
  it('formats as NNNN-NNNN', () => {
    expect(formatCode('1234')).toBe('1234');
    expect(formatCode('12345')).toBe('1234-5');
    expect(formatCode('12345678')).toBe('1234-5678');
  });
  it('knows when complete', () => {
    expect(isCodeComplete('1234-567')).toBe(false);
    expect(isCodeComplete('1234 5678')).toBe(true);
  });
});

describe('passwordProblem', () => {
  it('applies 10 to 128', () => {
    expect(passwordProblem('123456789')).toBe('short');
    expect(passwordProblem('1234567890')).toBeNull();
    expect(passwordProblem('a'.repeat(128))).toBeNull();
    expect(passwordProblem('a'.repeat(129))).toBe('long');
  });
});

describe('waitMinutes', () => {
  it('rounds up and handles missing', () => {
    expect(waitMinutes(undefined)).toBeNull();
    expect(waitMinutes(30)).toBe(1);
    expect(waitMinutes(61)).toBe(2);
  });
});
