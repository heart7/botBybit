/**
 * Error shape and mapping. Doc 04 §8 defines a structured error object
 * `{ error: { code, message } }`; we surface the same { code, message } to the UI
 * with friendly, non-leaky text rather than raw provider strings.
 */

export interface AppError {
  code: string;
  message: string;
}

export function appError(code: string, message: string): AppError {
  return { code, message };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AppError).code === 'string' &&
    typeof (value as AppError).message === 'string'
  );
}

/** Best-effort mapping of Supabase/PostgREST errors to a friendly AppError. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  const raw =
    (typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : '') || '';
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : undefined;
  const lower = raw.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return appError('invalid_credentials', 'Incorrect email or password.');
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return appError('user_already_exists', 'An account with this email already exists.');
  }
  if (lower.includes('weak password') || lower.includes('password should be')) {
    return appError('weak_password', 'Please choose a stronger password.');
  }
  if (lower.includes('email not confirmed')) {
    return appError('email_not_confirmed', 'Please confirm your email before signing in.');
  }
  if (status === 429 || lower.includes('rate limit')) {
    return appError('rate_limited', 'Too many attempts. Please wait a moment and try again.');
  }
  if (status === 401) {
    return appError('unauthorized', 'Your session has expired. Please sign in again.');
  }
  if (status === 403 || lower.includes('row-level security')) {
    return appError('forbidden', 'You do not have access to that.');
  }

  return appError('unknown', 'Something went wrong. Please try again.');
}
