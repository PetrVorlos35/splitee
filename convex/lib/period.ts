export type Period = "thisMonth" | "lastMonth" | "all";

const DEFAULT_TIME_ZONE = "Europe/Prague";

/** Rok/měsíc/den/čas v dané časové zóně pro daný UTC okamžik. */
function zonedParts(timeZone: string, instant: number) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const raw: Record<string, string> = {};
  for (const { type, value } of dtf.formatToParts(instant)) {
    if (type !== "literal") raw[type] = value;
  }
  return {
    year: Number(raw.year),
    month: Number(raw.month) - 1,
    day: Number(raw.day),
    hour: Number(raw.hour),
    minute: Number(raw.minute),
    second: Number(raw.second),
  };
}

/** Posun zóny vůči UTC v daném okamžiku (kladně = zóna napřed, např. CEST = +2 h). */
function offsetAt(timeZone: string, instant: number): number {
  const p = zonedParts(timeZone, instant);
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second);
  return asUtc - instant;
}

/**
 * UTC okamžik odpovídající místní půlnoci (year-month-day 00:00:00) v dané zóně.
 *
 * Postup: nejdřív odhadneme offset zóny, jako by cílový místní čas byl přímo UTC
 * instant, a tím odhadem spočítáme kandidátní UTC okamžik. Pak offset přepočítáme
 * znovu z tohoto kandidáta — kolem přechodu letního/zimního času se totiž offset
 * v okolí půlnoci může lišit od offsetu odhadnutého na první pokus (např. půlnoc
 * uprostřed hodiny, která při jarním posunu vůbec neexistuje, nebo je na podzim
 * zdvojená). Druhá iterace tuhle hranu opraví; další iterace už offset nezmění,
 * protože DST přechody se nekonají dvakrát za sebou v rozestupu jedné hodiny.
 */
function localMidnightUtc(timeZone: string, year: number, month: number, day: number): number {
  const target = Date.UTC(year, month, day, 0, 0, 0);
  const offset1 = offsetAt(timeZone, target);
  const candidate = target - offset1;
  const offset2 = offsetAt(timeZone, candidate);
  return offset2 === offset1 ? candidate : target - offset2;
}

/**
 * Rozsah pro koláč a feed. `all` schválně sahá i do budoucna — uživatel si
 * může výdaj datovat na zítřek a nesmí mu zmizet ze seznamu.
 *
 * Hranice měsíce se počítají v místní časové zóně (výchozí Europe/Prague), ne
 * v UTC — jinak by výdaj zapsaný mezi půlnocí a 1./2. hodinou 1. dne spadl do
 * předchozího měsíce a uživatel otevírající appku krátce po půlnoci by viděl
 * rozsah pro měsíc, který právě skončil.
 */
export function periodRange(
  period: Period,
  now: number,
  timeZone: string = DEFAULT_TIME_ZONE,
): { from: number; to: number } {
  if (period === "all") return { from: 0, to: Number.MAX_SAFE_INTEGER };

  const { year, month } = zonedParts(timeZone, now);
  const offset = period === "lastMonth" ? -1 : 0;

  return {
    from: localMidnightUtc(timeZone, year, month + offset, 1),
    to: localMidnightUtc(timeZone, year, month + offset + 1, 1) - 1,
  };
}
