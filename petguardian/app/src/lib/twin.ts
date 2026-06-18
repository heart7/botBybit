/**
 * Digital Twin history (Doc 08 §3). Weight tracking plus a unified, read-only
 * timeline that merges every history source the Twin holds. Most sources are empty
 * until later build steps populate them (media in Step 5, assessments in Step 6+),
 * but the timeline renders them automatically once they exist.
 *
 * Adding a weight only inserts history; pets.current_weight_kg is kept in sync by a
 * database trigger (migration 0010), so the snapshot can never drift.
 */
import { supabase } from './supabase';
import { toAppError } from './errors';

export interface WeightEntry {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

export async function listWeights(petId: string, limit = 60): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('pet_weight_history')
    .select('id, weight_kg, recorded_at')
    .eq('pet_id', petId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as WeightEntry[];
}

export async function addWeight(
  petId: string,
  weightKg: number,
  recordedAt?: string,
): Promise<void> {
  const row: { pet_id: string; weight_kg: number; recorded_at?: string } = {
    pet_id: petId,
    weight_kg: weightKg,
  };
  if (recordedAt) row.recorded_at = recordedAt;
  const { error } = await supabase.from('pet_weight_history').insert(row);
  if (error) throw toAppError(error);
}

export type TimelineKind = 'weight' | 'vaccination' | 'medication' | 'event' | 'assessment';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  date: string;
  title: string;
  subtitle?: string;
}

export async function getTimeline(petId: string, perType = 20): Promise<TimelineItem[]> {
  const eq = (table: string, cols: string, orderCol: string) =>
    supabase
      .from(table)
      .select(cols)
      .eq('pet_id', petId)
      .order(orderCol, { ascending: false })
      .limit(perType);

  const [weights, vaccinations, medications, events, assessments] = await Promise.all([
    eq('pet_weight_history', 'id, weight_kg, recorded_at', 'recorded_at'),
    eq('pet_vaccinations', 'id, vaccine, administered_at, next_due_at, created_at', 'created_at'),
    eq('pet_medications', 'id, name, dosage, start_at, created_at', 'created_at'),
    eq('pet_health_events', 'id, event_type, description, occurred_at', 'occurred_at'),
    eq('ai_assessments', 'id, triage_level, summary, created_at', 'created_at'),
  ]);

  const firstError =
    weights.error || vaccinations.error || medications.error || events.error || assessments.error;
  if (firstError) throw toAppError(firstError);

  const items: TimelineItem[] = [];

  for (const r of (weights.data ?? []) as unknown as Array<{
    id: string;
    weight_kg: number;
    recorded_at: string;
  }>) {
    items.push({ id: `w_${r.id}`, kind: 'weight', date: r.recorded_at, title: `Weight ${r.weight_kg} kg` });
  }
  for (const r of (vaccinations.data ?? []) as unknown as Array<{
    id: string;
    vaccine: string;
    administered_at: string | null;
    next_due_at: string | null;
    created_at: string;
  }>) {
    items.push({
      id: `v_${r.id}`,
      kind: 'vaccination',
      date: r.administered_at ?? r.created_at,
      title: `Vaccination: ${r.vaccine}`,
      subtitle: r.next_due_at ? `Next due ${r.next_due_at}` : undefined,
    });
  }
  for (const r of (medications.data ?? []) as unknown as Array<{
    id: string;
    name: string;
    dosage: string | null;
    start_at: string | null;
    created_at: string;
  }>) {
    items.push({
      id: `m_${r.id}`,
      kind: 'medication',
      date: r.start_at ?? r.created_at,
      title: `Medication: ${r.name}`,
      subtitle: r.dosage ?? undefined,
    });
  }
  for (const r of (events.data ?? []) as unknown as Array<{
    id: string;
    event_type: string;
    description: string | null;
    occurred_at: string;
  }>) {
    items.push({
      id: `e_${r.id}`,
      kind: 'event',
      date: r.occurred_at,
      title: r.event_type,
      subtitle: r.description ?? undefined,
    });
  }
  for (const r of (assessments.data ?? []) as unknown as Array<{
    id: string;
    triage_level: string;
    summary: string;
    created_at: string;
  }>) {
    items.push({
      id: `a_${r.id}`,
      kind: 'assessment',
      date: r.created_at,
      title: `Assessment: ${r.triage_level}`,
      subtitle: r.summary,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}
