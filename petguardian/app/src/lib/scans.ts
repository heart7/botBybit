/**
 * Scan submission (Doc 02 data flow, Doc 04 §4). The app creates a `pending` scan
 * carrying the owner inputs (optional photo + symptom payload). The AI engine
 * (Step 7, process_scan) consumes it and writes the ai_assessment + health score.
 * RLS lets a user create scans only for their own pets and read only their own.
 */
import { supabase } from './supabase';
import { appError, toAppError } from './errors';
import type { TriageLevel } from './triage';

export type ScanStatus = 'pending' | 'complete' | 'failed';

export interface Scan {
  id: string;
  pet_id: string;
  user_id: string;
  input_media_id: string | null;
  symptom_payload: Record<string, unknown> | null;
  status: ScanStatus;
  created_at: string;
}

export interface Assessment {
  id: string;
  scan_id: string;
  pet_id: string;
  triage_level: TriageLevel;
  summary: string;
  factors: string[];
  created_at: string;
}

export interface CreateScanInput {
  petId: string;
  inputMediaId?: string | null;
  symptomPayload: Record<string, unknown>;
}

export async function createScan(input: CreateScanInput): Promise<Scan> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw appError('unauthorized', 'You are not signed in.');

  const { data, error } = await supabase
    .from('scans')
    .insert({
      pet_id: input.petId,
      user_id: uid,
      input_media_id: input.inputMediaId ?? null,
      symptom_payload: input.symptomPayload,
      status: 'pending',
    })
    .select('id, pet_id, user_id, input_media_id, symptom_payload, status, created_at')
    .single();
  if (error) throw toAppError(error);
  return data as Scan;
}

export async function getScanWithAssessment(
  scanId: string,
): Promise<{ scan: Scan | null; assessment: Assessment | null }> {
  const [{ data: scan, error: scanError }, { data: assessment, error: aError }] = await Promise.all([
    supabase
      .from('scans')
      .select('id, pet_id, user_id, input_media_id, symptom_payload, status, created_at')
      .eq('id', scanId)
      .maybeSingle(),
    supabase
      .from('ai_assessments')
      .select('id, scan_id, pet_id, triage_level, summary, factors, created_at')
      .eq('scan_id', scanId)
      .maybeSingle(),
  ]);
  if (scanError) throw toAppError(scanError);
  if (aError) throw toAppError(aError);
  return { scan: scan as Scan | null, assessment: assessment as Assessment | null };
}

export async function listScans(petId: string, limit = 50): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('id, pet_id, user_id, input_media_id, symptom_payload, status, created_at')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as Scan[];
}
