import { ConvexError } from "convex/values";
import { ERROR } from "../../lib/errors";

export type Participant = { userId: string; joinedAt: number; weight?: number };
export type SplitRow = { userId: string; amount: number };

/** Deterministické pořadí účastníků: podle vstupu do party, při shodě podle id. */
function byJoinOrder(a: { joinedAt: number; userId: string }, b: { joinedAt: number; userId: string }) {
  return a.joinedAt - b.joinedAt || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
}

function assertAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    // ConvexError, ne obyčejný Error — tyhle funkce teď volají mutace
    // v convex/expenses.ts, kde by produkce zprávu obyčejného Error
    // zredagovala na anglické "Server Error".
    throw new ConvexError({ code: ERROR.AMOUNT_INVALID });
  }
}

export function splitEqual(amount: number, participants: Participant[]): SplitRow[] {
  assertAmount(amount);
  if (participants.length === 0) throw new ConvexError({ code: ERROR.NO_PARTICIPANTS });

  const ordered = [...participants].sort(byJoinOrder);
  const base = Math.floor(amount / ordered.length);
  const remainder = amount - base * ordered.length;

  // zbytkové haléře dostanou první podle pořadí vstupu do party
  return ordered.map((p, i) => ({ userId: p.userId, amount: base + (i < remainder ? 1 : 0) }));
}

export function splitShares(amount: number, participants: Participant[]): SplitRow[] {
  assertAmount(amount);
  if (participants.length === 0) throw new ConvexError({ code: ERROR.NO_PARTICIPANTS });
  if (participants.some((p) => !(p.weight! > 0))) {
    throw new ConvexError({ code: ERROR.WEIGHT_INVALID });
  }

  const totalWeight = participants.reduce((s, p) => s + p.weight!, 0);
  const rows = participants.map((p) => {
    const exact = (amount * p.weight!) / totalWeight;
    const floored = Math.floor(exact);
    return { userId: p.userId, joinedAt: p.joinedAt, amount: floored, frac: exact - floored };
  });

  // metoda největšího zbytku; při shodě zlomků rozhoduje pořadí vstupu do party
  const remainder = amount - rows.reduce((s, r) => s + r.amount, 0);
  const byFrac = [...rows].sort((a, b) => b.frac - a.frac || byJoinOrder(a, b));
  for (let i = 0; i < remainder; i++) byFrac[i].amount += 1;

  return rows.sort(byJoinOrder).map((r) => ({ userId: r.userId, amount: r.amount }));
}

export function validateExact(amount: number, entries: SplitRow[]): SplitRow[] {
  assertAmount(amount);
  if (entries.length === 0) throw new ConvexError({ code: ERROR.NO_PARTICIPANTS });
  if (entries.some((e) => !Number.isSafeInteger(e.amount) || e.amount < 0)) {
    throw new ConvexError({ code: ERROR.SPLIT_AMOUNT_INVALID });
  }
  const total = entries.reduce((s, e) => s + e.amount, 0);
  if (total !== amount) {
    throw new ConvexError({ code: ERROR.SPLIT_SUM_MISMATCH, total, amount });
  }
  return entries;
}
