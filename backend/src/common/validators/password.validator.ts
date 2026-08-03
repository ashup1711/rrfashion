/**
 * REQ-BE-010: Strong password policy.
 *
 * Custom class-validator decorator that enforces a 10-character minimum
 * and requires uppercase, lowercase, digit, and symbol characters.
 *
 * Usage:
 *   @IsStrongPassword()
 *   password: string;
 *
 * The implementation is intentionally small and side-effect-free: the
 * decorator only validates the string against the policy. HIBP lookup
 * (REQ-BE-011) is a separate concern performed by AuthService.
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 10 characters and include uppercase, lowercase, digit, and symbol characters';

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return this.isStrongEnough(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return STRONG_PASSWORD_MESSAGE;
  }

  /**
   * Pure-function form of the policy check so AuthService can reuse it
   * outside the class-validator pipeline (e.g. for HIBP preflight or
   * service-layer guards). Keeping a single source of truth ensures the
   * DTO-level check and any service-level re-check never drift.
   */
  isStrongEnough(value: string): boolean {
    if (value.length < 10) return false;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    return hasUpper && hasLower && hasDigit && hasSymbol;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Reusable predicate that other services (HIBP check, password reset flow)
 * can call without going through class-validator. Mirrors the policy in
 * IsStrongPasswordConstraint so behavior is identical.
 */
export function isStrongPassword(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.length < 10) return false;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasUpper && hasLower && hasDigit && hasSymbol;
}
