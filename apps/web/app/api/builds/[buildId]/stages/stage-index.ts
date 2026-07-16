// Postgres int4 max — stageIndex is stored in an `integer` column, so anything
// beyond this range would otherwise reach Drizzle and throw an unhandled
// "integer out of range" error instead of a clean 404.
export const POSTGRES_INT4_MAX = 2_147_483_647;

export function parseStageIndex(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 0 && value <= POSTGRES_INT4_MAX
    ? value
    : null;
}
