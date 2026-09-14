import { describe, expect, it } from "vitest";
import { periodRange } from "../lib/period";

const BREZEN = Date.UTC(2026, 2, 15, 12, 0, 0); // 15. 3. 2026

describe("periodRange", () => {
  it("tento měsíc sahá od prvního do konce měsíce", () => {
    const { from, to } = periodRange("thisMonth", BREZEN);
    expect(from).toBe(Date.UTC(2026, 2, 1));
    expect(to).toBe(Date.UTC(2026, 3, 1) - 1);
  });

  it("minulý měsíc je únor", () => {
    const { from, to } = periodRange("lastMonth", BREZEN);
    expect(from).toBe(Date.UTC(2026, 1, 1));
    expect(to).toBe(Date.UTC(2026, 2, 1) - 1);
  });

  it("přes přelom roku ukazuje minulý měsíc na prosinec", () => {
    const leden = Date.UTC(2026, 0, 10);
    const { from, to } = periodRange("lastMonth", leden);
    expect(from).toBe(Date.UTC(2025, 11, 1));
    expect(to).toBe(Date.UTC(2026, 0, 1) - 1);
  });

  it("Vše pobere i výdaj datovaný na zítřek", () => {
    const { from, to } = periodRange("all", BREZEN);
    expect(from).toBe(0);
    expect(to).toBeGreaterThan(BREZEN + 86400000);
  });
});
