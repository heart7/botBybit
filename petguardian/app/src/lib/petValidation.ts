/**
 * Pet input validation (Doc 08 §8: "Validation on all Twin inputs"). Pure functions
 * with no React Native imports so they are unit-testable and safe to import anywhere.
 * Also the single source of the pet enum values used across the app.
 */

export const SPECIES = ['dog', 'cat'] as const;
export type Species = (typeof SPECIES)[number];

export const SEX = ['male', 'female', 'unknown'] as const;
export type Sex = (typeof SEX)[number];

export const PET_NAME_MAX = 60;
export const BREED_MAX = 60;
export const WEIGHT_MAX_KG = 200;

export function validatePetName(name: string): string | null {
  const v = name.trim();
  if (v.length === 0) return 'Name is required.';
  if (v.length > PET_NAME_MAX) return `Name must be ${PET_NAME_MAX} characters or fewer.`;
  return null;
}

export function validateSpecies(species: string): string | null {
  return (SPECIES as readonly string[]).includes(species) ? null : 'Choose a species.';
}

/** Optional. Empty is allowed; if set it must be one of the known values. */
export function validateSex(sex: string): string | null {
  if (sex.length === 0) return null;
  return (SEX as readonly string[]).includes(sex) ? null : 'Choose a valid option.';
}

/** Optional breed free text. */
export function validateBreed(breed: string): string | null {
  if (breed.trim().length > BREED_MAX) return `Breed must be ${BREED_MAX} characters or fewer.`;
  return null;
}

/** Optional date of birth as YYYY-MM-DD; must be a real, non-future date. */
export function validateDob(
  dob: string,
  today: string = new Date().toISOString().slice(0, 10),
): string | null {
  const v = dob.trim();
  if (v.length === 0) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return 'Use the format YYYY-MM-DD.';
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return 'Enter a valid date.';
  if (v > today) return 'Date of birth cannot be in the future.';
  return null;
}

/** Parses a weight text field. Returns the number, or null if blank/invalid. */
export function parseWeight(input: string): number | null {
  const v = input.trim();
  if (v.length === 0) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Validates a required weight text field (used by "Log weight"). */
export function validateWeight(input: string): string | null {
  const v = input.trim();
  if (v.length === 0) return 'Weight is required.';
  const n = Number(v);
  if (!Number.isFinite(n)) return 'Enter a number.';
  if (n <= 0) return 'Weight must be greater than 0.';
  if (n > WEIGHT_MAX_KG) return `Weight must be ${WEIGHT_MAX_KG} kg or less.`;
  return null;
}
