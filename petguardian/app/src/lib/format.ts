/**
 * Pure display formatters (age from DOB, dates, weight). UTC-based so age is
 * deterministic and unit-testable regardless of device timezone.
 */

export function deriveAge(
  dob: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
  if (!m) return null;
  const birthYear = Number(m[1]);
  const birthMonth = Number(m[2]); // 1-12
  const birthDay = Number(m[3]);

  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth() + 1;
  const nowDay = now.getUTCDate();

  let months = (nowYear - birthYear) * 12 + (nowMonth - birthMonth);
  if (nowDay < birthDay) months -= 1;
  if (months < 0) return null; // future DOB

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0 && remMonths === 0) return '< 1 mo';
  if (years === 0) return `${remMonths} mo`;
  if (remMonths === 0) return `${years} yr`;
  return `${years} yr ${remMonths} mo`;
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return `${kg} kg`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
