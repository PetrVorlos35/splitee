import { describe, expect, it } from "vitest";
import { periodRange } from "../lib/period";

const BREZEN = Date.UTC(2026, 2, 15, 12, 0, 0); // 15. 3. 2026, ještě CET (UTC+1)

// Hranice v tomto souboru jsou spočtené pro Europe/Prague (výchozí zóna periodRange),
// ne pro UTC půlnoc — kolem hranice měsíce se totiž liší podle toho, jestli je zrovna
// středoevropský čas (CET, UTC+1) nebo letní čas (CEST, UTC+2). Hodnoty níž byly
// nezávisle ověřené přes Intl.DateTimeFormat mimo testovanou implementaci.

describe("periodRange", () => {
  it("tento měsíc sahá od prvního do konce měsíce (hranice v místním čase, ne UTC půlnoc)", () => {
    const { from, to } = periodRange("thisMonth", BREZEN);
    expect(from).toBe(Date.UTC(2026, 1, 28, 23, 0, 0)); // 1. 3. 2026 00:00 CET = 28. 2. 23:00 UTC
    expect(to).toBe(Date.UTC(2026, 2, 31, 22, 0, 0) - 1); // těsně před 1. 4. 2026 00:00 CEST = 31. 3. 22:00 UTC
  });

  it("minulý měsíc je únor (hranice v místním čase)", () => {
    const { from, to } = periodRange("lastMonth", BREZEN);
    expect(from).toBe(Date.UTC(2026, 0, 31, 23, 0, 0)); // 1. 2. 2026 00:00 CET = 31. 1. 23:00 UTC
    expect(to).toBe(Date.UTC(2026, 1, 28, 23, 0, 0) - 1); // těsně před 1. 3. 2026 00:00 CET
  });

  it("přes přelom roku ukazuje minulý měsíc na prosinec", () => {
    const leden = Date.UTC(2026, 0, 10);
    const { from, to } = periodRange("lastMonth", leden);
    expect(from).toBe(Date.UTC(2025, 10, 30, 23, 0, 0)); // 1. 12. 2025 00:00 CET = 30. 11. 23:00 UTC
    expect(to).toBe(Date.UTC(2025, 11, 31, 23, 0, 0) - 1); // těsně před 1. 1. 2026 00:00 CET
  });

  it("přes přelom roku počítá tento měsíc jako leden, ne prosinec", () => {
    const leden = Date.UTC(2026, 0, 10);
    const { from, to } = periodRange("thisMonth", leden);
    expect(from).toBe(Date.UTC(2025, 11, 31, 23, 0, 0)); // 1. 1. 2026 00:00 CET = 31. 12. 2025 23:00 UTC
    expect(to).toBe(Date.UTC(2026, 0, 31, 23, 0, 0) - 1); // těsně před 1. 2. 2026 00:00 CET
  });

  it("Vše pobere i výdaj datovaný na zítřek", () => {
    const { from, to } = periodRange("all", BREZEN);
    expect(from).toBe(0);
    expect(to).toBeGreaterThan(BREZEN + 86400000);
  });

  it("výdaj zapsaný 00:30 místního času 1. dne patří už do nového měsíce, ne do předchozího", () => {
    // UTC půlnoc by tenhle okamžik (28. 2. 23:30 UTC) ještě přiřadila únoru —
    // v místním čase (Europe/Prague) je ale už 00:30 1. 3., takže musí spadnout do března.
    const tesneKPulnoci = Date.UTC(2026, 1, 28, 23, 30, 0); // 1. 3. 2026 00:30 CET
    const { from } = periodRange("thisMonth", tesneKPulnoci);
    expect(from).toBe(Date.UTC(2026, 1, 28, 23, 0, 0)); // hranice března, ne února
  });

  it("hranice měsíce reaguje na přechod na letní čas (konec března 2026)", () => {
    // Březen 2026 začíná v CET (+1) a končí až po přechodu na CEST (+2) 29. 3. 2026 —
    // horní hranice měsíce proto leží o hodinu jinde v UTC, než kdyby zóna byla celý
    // měsíc ve stejném posunu.
    const { from, to } = periodRange("thisMonth", BREZEN);
    expect(from).toBe(Date.UTC(2026, 1, 28, 23, 0, 0)); // CET
    expect(to).toBe(Date.UTC(2026, 2, 31, 22, 0, 0) - 1); // CEST
  });

  it("hranice měsíce reaguje na přechod ze letního na zimní čas (konec října 2026)", () => {
    // Říjen 2026 začíná v CEST (+2) a končí až po přechodu zpátky na CET (+1) 25. 10. 2026.
    const rijen = Date.UTC(2026, 9, 15, 12, 0, 0); // 15. 10. 2026, uprostřed CEST
    const { from, to } = periodRange("thisMonth", rijen);
    expect(from).toBe(Date.UTC(2026, 8, 30, 22, 0, 0)); // 1. 10. 2026 00:00 CEST = 30. 9. 22:00 UTC
    expect(to).toBe(Date.UTC(2026, 9, 31, 23, 0, 0) - 1); // těsně před 1. 11. 2026 00:00 CET = 31. 10. 23:00 UTC
  });
});
