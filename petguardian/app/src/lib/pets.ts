/**
 * Pet (Digital Twin root) data access. RLS scopes every query to the owner.
 *
 * Delete is a SOFT delete (sets deleted_at) rather than the hard cascade in Doc 04
 * §3 — this preserves the Twin (a "defensible data asset", Doc 08 §2) and supports
 * anonymise-over-erase retention (Doc 09 §8). Hard cascade remains available
 * server-side for GDPR erasure. Flagged in docs/STEP-04-NOTES.md.
 */
import { supabase } from './supabase';
import { appError, toAppError } from './errors';
import type { Sex, Species } from './petValidation';

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: Species;
  breed: string | null;
  sex: Sex | null;
  date_of_birth: string | null;
  current_weight_kg: number | null;
  avatar_media_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PetInput {
  name: string;
  species: Species;
  breed?: string | null;
  sex?: Sex | null;
  date_of_birth?: string | null;
}

function toRow(input: PetInput) {
  return {
    name: input.name.trim(),
    species: input.species,
    breed: input.breed?.trim() || null,
    sex: input.sex || null,
    date_of_birth: input.date_of_birth?.trim() || null,
  };
}

export async function listPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw toAppError(error);
  return (data ?? []) as Pet[];
}

export async function getPet(id: string): Promise<Pet | null> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data as Pet | null;
}

export async function createPet(input: PetInput): Promise<Pet> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw appError('unauthorized', 'You are not signed in.');

  const { data, error } = await supabase
    .from('pets')
    .insert({ user_id: uid, ...toRow(input) })
    .select()
    .single();
  if (error) throw toAppError(error);
  return data as Pet;
}

export async function updatePet(id: string, input: PetInput): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .update(toRow(input))
    .eq('id', id)
    .select()
    .single();
  if (error) throw toAppError(error);
  return data as Pet;
}

export async function softDeletePet(id: string): Promise<void> {
  const { error } = await supabase
    .from('pets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw toAppError(error);
}
