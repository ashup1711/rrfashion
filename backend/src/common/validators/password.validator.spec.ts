/**
 * REQ-BE-010: Strong password policy unit tests.
 *
 * The decorator implementation lives in
 * `common/validators/password.validator.ts`. These tests verify the
 * plain-function form (re-used by AuthService) so a future service-layer
 * guard cannot drift from the DTO-level rule.
 */
import { isStrongPassword } from './password.validator';

describe('isStrongPassword', () => {
  it('accepts a password that meets every rule', () => {
    expect(isStrongPassword('Str0ng!Pass')).toBe(true);
    expect(isStrongPassword('aB1!aaaaaaaa')).toBe(true);
    expect(isStrongPassword('MixedCase!23X')).toBe(true);
  });

  it('rejects passwords shorter than 10 characters', () => {
    expect(isStrongPassword('Ab1!aaaaa')).toBe(false); // 9 chars
    expect(isStrongPassword('Aa1!')).toBe(false); // 5 chars
    expect(isStrongPassword('')).toBe(false);
  });

  it('rejects passwords missing uppercase', () => {
    expect(isStrongPassword('str0ng!pass')).toBe(false);
  });

  it('rejects passwords missing lowercase', () => {
    expect(isStrongPassword('STR0NG!PASS')).toBe(false);
  });

  it('rejects passwords missing digits', () => {
    expect(isStrongPassword('Strong!Pass!')).toBe(false);
  });

  it('rejects passwords missing symbols', () => {
    expect(isStrongPassword('StrongPass12')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isStrongPassword(null as unknown as string)).toBe(false);
    expect(isStrongPassword(undefined as unknown as string)).toBe(false);
    expect(isStrongPassword(1234567890 as unknown as string)).toBe(false);
  });

  it('accepts long passphrases with the four required character classes', () => {
    expect(isStrongPassword('CorrectHorseBattery!9Staple')).toBe(true);
  });
});
