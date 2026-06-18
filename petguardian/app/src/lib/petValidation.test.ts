import {
  parseWeight,
  validateBreed,
  validateDob,
  validatePetName,
  validateSex,
  validateSpecies,
  validateWeight,
} from './petValidation';

describe('validatePetName', () => {
  it('accepts a normal name', () => expect(validatePetName('Rex')).toBeNull());
  it('requires a value', () => expect(validatePetName('   ')).toMatch(/required/i));
  it('rejects over-long names', () => expect(validatePetName('x'.repeat(100))).toMatch(/or fewer/i));
});

describe('validateSpecies', () => {
  it('accepts dog and cat', () => {
    expect(validateSpecies('dog')).toBeNull();
    expect(validateSpecies('cat')).toBeNull();
  });
  it('rejects anything else', () => expect(validateSpecies('hamster')).toMatch(/species/i));
});

describe('validateSex', () => {
  it('allows empty (optional)', () => expect(validateSex('')).toBeNull());
  it('accepts known values', () => expect(validateSex('female')).toBeNull());
  it('rejects unknown junk', () => expect(validateSex('robot')).toMatch(/valid/i));
});

describe('validateBreed', () => {
  it('allows empty', () => expect(validateBreed('')).toBeNull());
  it('rejects over-long', () => expect(validateBreed('x'.repeat(100))).toMatch(/or fewer/i));
});

describe('validateDob', () => {
  const today = '2026-06-18';
  it('allows empty (optional)', () => expect(validateDob('', today)).toBeNull());
  it('accepts a past date', () => expect(validateDob('2020-01-01', today)).toBeNull());
  it('rejects the future', () => expect(validateDob('2027-01-01', today)).toMatch(/future/i));
  it('rejects bad format', () => expect(validateDob('01-01-2020', today)).toMatch(/YYYY-MM-DD/));
  it('rejects impossible months', () => expect(validateDob('2020-13-01', today)).toMatch(/valid/i));
});

describe('weight parsing & validation', () => {
  it('parses numbers and blanks', () => {
    expect(parseWeight('11.5')).toBe(11.5);
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('abc')).toBeNull();
  });
  it('validates required/positive/bounded', () => {
    expect(validateWeight('11.5')).toBeNull();
    expect(validateWeight('')).toMatch(/required/i);
    expect(validateWeight('-2')).toMatch(/greater than 0/i);
    expect(validateWeight('0')).toMatch(/greater than 0/i);
    expect(validateWeight('999')).toMatch(/or less/i);
    expect(validateWeight('abc')).toMatch(/number/i);
  });
});
