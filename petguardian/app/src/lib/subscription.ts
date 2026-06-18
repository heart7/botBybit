/**
 * Subscription read access. The row is created at signup by handle_new_user()
 * and is read-only to the client (writes happen server-side; see RLS migration).
 */
import { supabase } from './supabase';
import { toAppError } from './errors';

export type Tier = 'free' | 'basic' | 'premium' | 'family' | 'breeder';

export interface Subscription {
  id: string;
  tier: Tier;
  status: 'active' | 'past_due' | 'cancelled';
  scans_used: number;
  scans_period_start: string;
  renews_at: string | null;
}

/**
 * Monthly scan cap per tier. Only the free tier (3/month) is specified in the
 * package (Doc 04 §7); the rest are placeholders to confirm. null = uncapped/TBD.
 */
export const TIER_SCAN_LIMIT: Record<Tier, number | null> = {
  free: 3,
  basic: null,
  premium: null,
  family: null,
  breeder: null,
};

export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle();
  if (error) throw toAppError(error);
  return data as Subscription | null;
}
