/**
 * Profile data access. RLS guarantees a user can only see/edit their own row
 * (profiles.id = auth.uid()), so these queries are implicitly self-scoped.
 */
import { supabase } from './supabase';
import { appError, toAppError } from './errors';

export interface Profile {
  id: string;
  display_name: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePatch {
  display_name?: string | null;
  country?: string | null;
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw toAppError(error);
  return data as Profile | null;
}

export async function updateMyProfile(patch: ProfilePatch): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw appError('unauthorized', 'You are not signed in.');

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', uid)
    .select()
    .single();
  if (error) throw toAppError(error);
  return data as Profile;
}
