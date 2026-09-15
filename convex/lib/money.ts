import { ConvexError } from "convex/values";
import { ERROR } from "../../lib/errors";

/**
 * Strop pro jeden výdaj: 10 000 000 Kč (1 miliarda haléřů). Žádný výdaj v partě
 * takové sumy nedosáhne, ale strop je hluboko pod Number.MAX_SAFE_INTEGER
 * (2^53 − 1 ≈ 9 007 bilionů haléřů), takže i po dalších výpočtech (násobení
 * váhou ve splitShares apod.) zůstáváme bezpečně v rozsahu bezpečných celých čísel.
 */
export const MAX_AMOUNT_HALERU = 1_000_000_000;

/** „340,50" i „1 234.5" → haléře. Vstup z formuláře je vždy text. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[\s\u00A0]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    // ConvexError, ne obyčejný Error — convex/expenses.ts z tohohle modulu
    // importuje MAX_AMOUNT_HALERU pro stejnou hranici při zápisu na
    // serveru, takže tenhle soubor teď žije i na straně mutace.
    throw new ConvexError({ code: ERROR.AMOUNT_FORMAT_INVALID });
  }
  const haleru = Math.round(Number(cleaned) * 100);
  if (!Number.isInteger(haleru) || haleru <= 0) {
    throw new ConvexError({ code: ERROR.AMOUNT_NOT_POSITIVE });
  }
  if (haleru > MAX_AMOUNT_HALERU) {
    throw new ConvexError({ code: ERROR.AMOUNT_TOO_LARGE });
  }
  return haleru;
}

/** Haléře → „340,50 Kč". Jediné místo, kde se z integeru stává text. */
export function formatAmount(haleru: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(haleru / 100);
}
