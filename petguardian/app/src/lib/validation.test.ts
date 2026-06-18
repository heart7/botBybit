import {
  PASSWORD_MIN_LENGTH,
  validateCountry,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './validation';

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('owner@example.com')).toBeNull();
  });
  it('trims surrounding whitespace before checking', () => {
    expect(validateEmail('  owner@example.com  ')).toBeNull();
  });
  it('rejects empty and malformed addresses', () => {
    expect(validateEmail('')).toMatch(/required/i);
    expect(validateEmail('not-an-email')).toMatch(/valid/i);
    expect(validateEmail('a@b')).toMatch(/valid/i);
  });
});

describe('validatePassword', () => {
  it('accepts a sufficiently strong password', () => {
    expect(validatePassword('sunflower9')).toBeNull();
  });
  it(`rejects passwords shorter than ${PASSWORD_MIN_LENGTH}`, () => {
    expect(validatePassword('ab1')).toMatch(/at least/i);
  });
  it('requires a letter and a number', () => {
    expect(validatePassword('allletters')).toMatch(/letter and one number/i);
    expect(validatePassword('12345678')).toMatch(/letter and one number/i);
  });
  it('rejects over-long passwords (bcrypt limit)', () => {
    expect(validatePassword('a1'.repeat(40))).toMatch(/or fewer/i);
  });
});

describe('optional fields', () => {
  it('allow empty values', () => {
    expect(validateDisplayName('')).toBeNull();
    expect(validateCountry('')).toBeNull();
  });
  it('reject over-long values', () => {
    expect(validateDisplayName('x'.repeat(200))).toMatch(/or fewer/i);
    expect(validateCountry('x'.repeat(200))).toMatch(/too long/i);
  });
});
