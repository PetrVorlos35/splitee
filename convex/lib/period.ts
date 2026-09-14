export type Period = "thisMonth" | "lastMonth" | "all";

/**
 * Rozsah pro koláč a feed. `all` schválně sahá i do budoucna — uživatel si
 * může výdaj datovat na zítřek a nesmí mu zmizet ze seznamu.
 */
export function periodRange(period: Period, now: number): { from: number; to: number } {
  if (period === "all") return { from: 0, to: Number.MAX_SAFE_INTEGER };

  const d = new Date(now);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const offset = period === "lastMonth" ? -1 : 0;

  return {
    from: Date.UTC(year, month + offset, 1),
    to: Date.UTC(year, month + offset + 1, 1) - 1,
  };
}
