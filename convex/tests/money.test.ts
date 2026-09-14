import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "../lib/money";

describe("parseAmount", () => {
  it("bere desetinnou čárku i tečku", () => {
    expect(parseAmount("340,50")).toBe(34050);
    expect(parseAmount("340.50")).toBe(34050);
  });

  it("doplní chybějící haléře", () => {
    expect(parseAmount("340")).toBe(34000);
    expect(parseAmount("340,5")).toBe(34050);
  });

  it("ignoruje mezery včetně nezlomitelné", () => {
    expect(parseAmount("1 234,50")).toBe(123450);
    expect(parseAmount("1\u00A0234,50")).toBe(123450); // nezlomitelná mezera
  });

  it("zaokrouhlí na haléře", () => {
    expect(parseAmount("340,567")).toBe(34057);
  });

  it("spadne na nesmyslném vstupu", () => {
    expect(() => parseAmount("")).toThrow();
    expect(() => parseAmount("abc")).toThrow();
    expect(() => parseAmount("-50")).toThrow();
  });
});

describe("formatAmount", () => {
  it("vypíše částku česky s měnou", () => {
    expect(formatAmount(34050, "CZK").replace(/\s/g, " ")).toBe("340,50 Kč");
  });

  it("vypíše i celé koruny s haléři", () => {
    expect(formatAmount(34000, "CZK").replace(/\s/g, " ")).toBe("340,00 Kč");
  });

  it("umí i jinou měnu party", () => {
    expect(formatAmount(1050, "EUR")).toContain("10,50");
  });
});
