/**
 * Validation helpers shared by the public API routes. They deliberately stay
 * small and dependency-free so every handler applies the same rules.
 */

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

export function isIsoMonth(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function isSlug(value: string | null | undefined): value is string {
  return Boolean(value && /^[a-z0-9][a-z0-9._-]{0,39}$/i.test(value));
}

export function isTeamId(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{1,12}$/.test(value));
}

export function parseSeason(
  value: string | null | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  const upper = new Date().getUTCFullYear() + 1;
  const lower = upper - 12;
  if (parsed < lower || parsed > upper) return fallback;
  return parsed;
}

export function cleanQuery(
  value: string | null | undefined,
  maxLength = 80,
): string {
  if (!value) return "";
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function parseLimit(
  value: string | null | undefined,
  fallback: number,
  max = 100,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
