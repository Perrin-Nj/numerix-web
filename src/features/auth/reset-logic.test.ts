import { describe, expect, it } from 'vitest';
import { parseTokenFragment, passwordProblem, waitMinutes } from './reset-logic';

describe('parseTokenFragment', () => {
  it('reads the token', () => expect(parseTokenFragment('#token=abc123')).toBe('abc123'));
  it('ignores other parts', () => expect(parseTokenFragment('#a=1&token=xyz&b=2')).toBe('xyz'));
  it('decodes percent escapes and keeps plus', () => expect(parseTokenFragment('#token=a%2Fb+c')).toBe('a/b+c'));
  it('is null without a token', () => {
    expect(parseTokenFragment('')).toBeNull();
    expect(parseTokenFragment('#')).toBeNull();
    expect(parseTokenFragment('#token=')).toBeNull();
    expect(parseTokenFragment('#other=1')).toBeNull();
  });
  it('rejects spaces and huge values', () => {
    expect(parseTokenFragment('#token=a%20b')).toBeNull();
    expect(parseTokenFragment('#token=' + 'a'.repeat(2000))).toBeNull();
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
