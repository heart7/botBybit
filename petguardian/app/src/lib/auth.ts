/**
 * Auth operations (Doc 04 §2). Thin, validated wrappers over Supabase Auth.
 * The client only ever holds the anon key + the user's JWT; RLS does the rest.
 */
import { supabase } from './supabase';
import { appError, toAppError, type AppError } from './errors';
import { validateEmail, validatePassword } from './validation';

export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
  country?: string;
}

function assertValid(error: string | null): void {
  if (error) throw appError('validation_error', error) satisfies AppError;
}

export async function signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }> {
  assertValid(validateEmail(input.email));
  assertValid(validatePassword(input.password));

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // Becomes auth.users.raw_user_meta_data, which handle_new_user() reads to
      // populate the profile (Step 3 migration 0009).
      data: {
        display_name: input.displayName?.trim() || null,
        country: input.country?.trim() || null,
      },
    },
  });
  if (error) throw toAppError(error);

  // With email confirmations on, a user exists but there is no session yet.
  return { needsEmailConfirmation: data.session === null };
}

export async function signIn(email: string, password: string): Promise<void> {
  assertValid(validateEmail(email));
  if (password.length === 0) throw appError('validation_error', 'Password is required.');

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toAppError(error);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
