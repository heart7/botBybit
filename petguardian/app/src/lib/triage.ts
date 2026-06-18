/**
 * Triage model — the product's central safety guardrail, in one place.
 *
 * Non-negotiable rules (Doc 07 §2–3, Doc 12 §4):
 *   - AI output is triage and guidance, NEVER a diagnosis.
 *   - Every health assessment returns exactly one level: green, yellow, or orange.
 *   - There is no "red"/emergency level by design; orange is the highest and means
 *     "seek prompt veterinary care".
 *
 * Later steps (the AI engine, the assessment UI) import from here so the guardrail
 * is defined once and cannot drift.
 */

export const TRIAGE_LEVELS = ['green', 'yellow', 'orange'] as const;
export type TriageLevel = (typeof TRIAGE_LEVELS)[number];

export function isTriageLevel(value: unknown): value is TriageLevel {
  return typeof value === 'string' && (TRIAGE_LEVELS as readonly string[]).includes(value);
}

/** Owner-facing meaning of each level (Doc 07 §3). */
export const TRIAGE_GUIDANCE: Record<TriageLevel, { title: string; action: string }> = {
  green: { title: 'Monitor', action: 'Keep observing; no action needed right now.' },
  yellow: { title: 'Routine vet visit', action: 'Consider booking a non-urgent appointment.' },
  orange: { title: 'Urgent attention', action: 'Seek prompt veterinary care.' },
};

/**
 * The disclaimer that MUST accompany any AI assessment shown to a user.
 * Surfacing this is a guardrail, not a nicety.
 */
export const AI_GUIDANCE_DISCLAIMER =
  'This is AI-generated guidance to support — not replace — a conversation with a ' +
  'licensed veterinarian. It is not a diagnosis.';

/** The structured output contract the AI engine must return (Doc 07 §6.1, Doc 12 §7). */
export interface AiAssessmentOutput {
  triage_level: TriageLevel;
  summary: string;
  factors: string[];
}
