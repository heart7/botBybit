/**
 * Symptom questionnaire (Doc 05 §4.4). Pure data + helpers, unit-tested. Produces the
 * structured `symptom_payload` that a scan stores and the AI engine (Step 7) consumes
 * (shape per Doc 04 §4, e.g. { "lethargy": true, ... }).
 *
 * NOTE: the package does not specify the exact question set, so this content is a
 * placeholder for review (see docs/STEP-06-NOTES.md). British spelling matches the spec.
 */

export interface Option {
  id: string;
  label: string;
}

export const PRIMARY_CONCERNS: Option[] = [
  { id: 'skin_coat', label: 'Skin & coat' },
  { id: 'eating_drinking', label: 'Eating & drinking' },
  { id: 'energy_behaviour', label: 'Energy & behaviour' },
  { id: 'digestion', label: 'Digestion' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'breathing', label: 'Breathing' },
  { id: 'other', label: 'Something else' },
];

export const SYMPTOMS: Option[] = [
  { id: 'lethargy', label: 'Lethargy' },
  { id: 'reduced_appetite', label: 'Reduced appetite' },
  { id: 'vomiting', label: 'Vomiting' },
  { id: 'diarrhoea', label: 'Diarrhoea' },
  { id: 'coughing', label: 'Coughing' },
  { id: 'limping', label: 'Limping' },
  { id: 'scratching', label: 'Scratching / itching' },
  { id: 'drinking_more', label: 'Drinking more than usual' },
];

export const DURATIONS: Option[] = [
  { id: 'under_1_day', label: 'Less than a day' },
  { id: '1_3_days', label: '1–3 days' },
  { id: '4_7_days', label: '4–7 days' },
  { id: 'over_1_week', label: 'Over a week' },
];

export const NOTES_MAX = 1000;

export interface QuestionnaireAnswers {
  primaryConcern: string | null;
  symptoms: string[];
  duration: string | null;
  notes: string;
}

export const emptyAnswers: QuestionnaireAnswers = {
  primaryConcern: null,
  symptoms: [],
  duration: null,
  notes: '',
};

/**
 * Requires something to assess (a concern or at least one symptom) so the engine is
 * never asked to triage an empty submission. Returns an error string or null.
 */
export function validateAnswers(a: QuestionnaireAnswers): string | null {
  if (!a.primaryConcern && a.symptoms.length === 0) {
    return 'Pick a main concern or at least one symptom.';
  }
  if (a.notes.trim().length > NOTES_MAX) {
    return `Notes must be ${NOTES_MAX} characters or fewer.`;
  }
  return null;
}

/** Builds the persisted symptom_payload, omitting empty fields. */
export function buildSymptomPayload(a: QuestionnaireAnswers): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (a.primaryConcern) payload.primary_concern = a.primaryConcern;
  if (a.symptoms.length > 0) payload.symptoms = [...a.symptoms];
  if (a.duration) payload.duration = a.duration;
  const notes = a.notes.trim();
  if (notes) payload.notes = notes;
  return payload;
}
