import { describe, expect, it } from "vitest";
import { MESSAGE_KEY, errorMessage } from "./errors";
import { t } from "./i18n";

describe("errorMessage", () => {
  it("přeloží duck-typed ConvexError na českou větu", () => {
    expect(errorMessage({ data: { code: "GROUP_FULL" } })).toBe(
      "Parta je plná, víc než deset lidí to neutáhne.",
    );
  });

  it("neznámý kód spadne na obecnou hlášku, ne na syrové e.message", () => {
    expect(errorMessage({ data: { code: "TOTALLY_MADE_UP" } })).toBe(t("common.saveFailed"));
    // i bez ConvexError tvaru vůbec — síťová chyba, string, cokoli
    expect(errorMessage(new Error("network down"))).toBe(t("common.saveFailed"));
    expect(errorMessage("nope")).toBe(t("common.saveFailed"));
  });

  it("interpoluje proměnné z data (NICKNAME_TOO_LONG nese max)", () => {
    expect(errorMessage({ data: { code: "NICKNAME_TOO_LONG", max: 24 } })).toBe(
      "Přezdívka smí mít nejvýš 24 znaků.",
    );
  });

  // Review round 1, Minor: SPLIT_SUM_MISMATCH nese syrové haléře (total,
  // amount) — zobrazovací vrstva je musí naformátovat na Kč, ne vypsat
  // 9999 tam, kde má být 99,99 Kč.
  it("naformátuje syrové haléře na Kč (SPLIT_SUM_MISMATCH nese total i amount)", () => {
    const message = errorMessage({ data: { code: "SPLIT_SUM_MISMATCH", total: 9999, amount: 10000 } });
    expect(message.replace(/\s/g, " ")).toBe(
      "Součet podílů (99,99 Kč) nesedí na částku výdaje (100,00 Kč).",
    );
  });

  // Typ MESSAGE_KEY je Record<ErrorCode, string> — TypeScript ověří, že má
  // klíč pro každý ErrorCode, ale NE že ta hodnota (řetězec) skutečně
  // existuje v lib/i18n.ts. Překlep v překladovém klíči by tam proto tiše
  // přežil až do běhu, kde t() spadne — tenhle test tu mezeru, kterou
  // TypeScript nevidí, uzavírá při běhu testů.
  it("každý kód v MESSAGE_KEY má opravdu existující překlad", () => {
    for (const key of Object.values(MESSAGE_KEY)) {
      expect(() => t(key)).not.toThrow();
    }
  });
});
