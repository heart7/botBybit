/**
 * Pet media (Doc 02 §6, Doc 09 §5). Uploads to a PRIVATE Storage bucket under
 * {uid}/{petId}/..., records the path in pet_media, and reads files back only
 * through short-lived SIGNED URLs. The anon/JWT client never gets public links.
 */
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { appError, toAppError } from './errors';
import { extFromMime, kindFromMime, validateMedia, type MediaKind } from './mediaValidation';

export const PET_MEDIA_BUCKET = 'pet-media';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // short-lived (1h)

export interface PetMedia {
  id: string;
  pet_id: string;
  kind: MediaKind;
  storage_path: string;
  captured_at: string | null;
  created_at: string;
}

export interface PickedAsset {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export async function listPetMedia(petId: string, limit = 60): Promise<PetMedia[]> {
  const { data, error } = await supabase
    .from('pet_media')
    .select('id, pet_id, kind, storage_path, captured_at, created_at')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as PetMedia[];
}

export async function uploadPetMedia(petId: string, asset: PickedAsset): Promise<PetMedia> {
  const mime = asset.mimeType ?? undefined;
  const invalid = validateMedia(mime, asset.fileSize ?? undefined);
  if (invalid) throw appError('validation_error', invalid);
  const kind = kindFromMime(mime as string) as MediaKind;

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw appError('unauthorized', 'You are not signed in.');

  const ext = extFromMime(mime as string);
  const objectName = `${uid}/${petId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Reliable RN upload: read the local file as base64, decode to bytes, upload.
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const { error: uploadError } = await supabase.storage
    .from(PET_MEDIA_BUCKET)
    .upload(objectName, decode(base64), { contentType: mime, upsert: false });
  if (uploadError) throw toAppError(uploadError);

  const { data, error } = await supabase
    .from('pet_media')
    .insert({
      pet_id: petId,
      kind,
      storage_path: objectName,
      captured_at: new Date().toISOString(),
    })
    .select('id, pet_id, kind, storage_path, captured_at, created_at')
    .single();
  if (error) throw toAppError(error);
  return data as PetMedia;
}

export async function getSignedUrl(
  path: string,
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PET_MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw toAppError(error);
  return data?.signedUrl ?? null;
}

export async function getSignedUrls(
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(PET_MEDIA_BUCKET)
    .createSignedUrls(paths, expiresIn);
  if (error) throw toAppError(error);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function setPetAvatar(petId: string, mediaId: string): Promise<void> {
  const { error } = await supabase.from('pets').update({ avatar_media_id: mediaId }).eq('id', petId);
  if (error) throw toAppError(error);
}
