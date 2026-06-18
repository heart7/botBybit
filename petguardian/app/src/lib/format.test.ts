import { deriveAge, formatWeight } from './format';

const NOW = new Date('2026-06-18T00:00:00Z');

describe('deriveAge', () => {
  it('returns null without a DOB', () => {
    expect(deriveAge(null, NOW)).toBeNull();
    expect(deriveAge(undefined, NOW)).toBeNull();
  });
  it('computes whole years', () => {
    expect(deriveAge('2024-06-18', NOW)).toBe('2 yr');
  });
  it('computes months under a year', () => {
    expect(deriveAge('2026-01-18', NOW)).toBe('5 mo');
  });
  it('computes years and months', () => {
    expect(deriveAge('2023-03-18', NOW)).toBe('3 yr 3 mo');
  });
  it('handles newborns', () => {
    expect(deriveAge('2026-06-01', NOW)).toBe('< 1 mo');
  });
  it('returns null for a future DOB', () => {
    expect(deriveAge('2027-01-01', NOW)).toBeNull();
  });
  it('returns null for a malformed DOB', () => {
    expect(deriveAge('18/06/2024', NOW)).toBeNull();
  });
});

describe('formatWeight', () => {
  it('shows a dash when missing', () => expect(formatWeight(null)).toBe('—'));
  it('appends kg', () => expect(formatWeight(11.5)).toBe('11.5 kg'));
});
