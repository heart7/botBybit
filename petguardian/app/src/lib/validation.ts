/**
 * Input validation — a guardrail (Doc 09 §6: "Input validation on all entry points").
 * Pure functions, no React Native imports, so they are cheap to unit-test.
 * Each returns an error string, or null when the value is acceptable.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt truncates beyond 72 bytes
export const DISPLAY_NAME_MAX = 80;
export const COUNTRY_MAX = 56;

// Deliberately simple: catch obvious mistakes client-side; the server is the
// authority. Avoids the false rejections that over-clever email regexes cause.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (v.length === 0) return 'Email is required.';
  if (v.length > 254) return 'Email is too long.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'Password is required.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

/** Optional field: empty is allowed. */
export function validateDisplayName(name: string): string | null {
  const v = name.trim();
  if (v.length > DISPLAY_NAME_MAX) {
    return `Name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  }
  return null;
}

/** Optional field: empty is allowed. */
export function validateCountry(country: string): string | null {
  const v = country.trim();
  if (v.length > COUNTRY_MAX) return 'Country name is too long.';
  return null;
}
