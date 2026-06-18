/**
 * Consent management (Doc 09 §8, Doc 05 §4.1/4.7). The consents table is the
 * compliance backbone; Layer 3 (anonymised-learning) consent is explicit and
 * revocable. One current row per (user, consent_type), upserted on change.
 */
import { supabase } from './supabase';
import { appError, toAppError } from './errors';

export const CONSENT_LAYER3_LEARNING = 'layer3_learning';

export interface Consent {
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
}

export async function getConsent(consentType: string): Promise<Consent | null> {
  const { data, error } = await supabase
    .from('consents')
    .select('consent_type, granted, granted_at, revoked_at')
    .eq('consent_type', consentType)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data as Consent | null;
}

export async function setConsent(consentType: string, granted: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw appError('unauthorized', 'You are not signed in.');

  const now = new Date().toISOString();
  const { error } = await supabase.from('consents').upsert(
    {
      user_id: uid,
      consent_type: consentType,
      granted,
      granted_at: granted ? now : null,
      revoked_at: granted ? null : now,
    },
    { onConflict: 'user_id,consent_type' },
  );
  if (error) throw toAppError(error);
}
