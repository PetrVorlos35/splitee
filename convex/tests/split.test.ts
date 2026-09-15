import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { splitEqual, splitShares, validateExact } from "../lib/split";

const P = (...ids: string[]) => ids.map((userId, i) => ({ userId, joinedAt: i }));
const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

describe("splitEqual", () => {
  it("rozdělí 100 Kč mezi tři tak, že součet sedí na haléř", () => {
    const rows = splitEqual(10000, P("a", "b", "c"));
    expect(rows).toEqual([
      { userId: "a", amount: 3334 },
      { userId: "b", amount: 3333 },
      { userId: "c", amount: 3333 },
    ]);
    expect(sum(rows)).toBe(10000);
  });

  it("dělí beze zbytku, když to vyjde", () => {
    expect(splitEqual(9000, P("a", "b", "c"))).toEqual([
      { userId: "a", amount: 3000 },
      { userId: "b", amount: 3000 },
      { userId: "c", amount: 3000 },
    ]);
  });

  it("dá jediný haléř prvnímu podle pořadí vstupu do party", () => {
    expect(splitEqual(1, P("a", "b", "c"))).toEqual([
      { userId: "a", amount: 1 },
      { userId: "b", amount: 0 },
      { userId: "c", amount: 0 },
    ]);
  });

  it("dá stejný výsledek bez ohledu na pořadí vstupního pole", () => {
    const shuffled = [
      { userId: "c", joinedAt: 2 },
      { userId: "a", joinedAt: 0 },
      { userId: "b", joinedAt: 1 },
    ];
    expect(splitEqual(10000, shuffled)).toEqual(splitEqual(10000, P("a", "b", "c")));
  });

  it("součet sedí pro každý počet lidí 1..10 a každou částku 1..2000", () => {
    const ids = "abcdefghij".split("");
    for (let n = 1; n <= 10; n++) {
      for (let amount = 1; amount <= 2000; amount++) {
        expect(sum(splitEqual(amount, P(...ids.slice(0, n))))).toBe(amount);
      }
    }
  });

  it("odmítne nulovou a zápornou částku", () => {
    expect(() => splitEqual(0, P("a"))).toThrow();
    expect(() => splitEqual(-100, P("a"))).toThrow();
  });

  it("odmítne výdaj bez účastníků", () => {
    expect(() => splitEqual(10000, [])).toThrow();
  });

  it("odmítne částku mimo bezpečný rozsah celých čísel", () => {
    expect(() => splitEqual(Number.MAX_SAFE_INTEGER + 2, P("a"))).toThrow();
  });
});

describe("splitShares", () => {
  it("rozdělí v poměru 2:1:1", () => {
    const rows = splitShares(10000, [
      { userId: "a", joinedAt: 0, weight: 2 },
      { userId: "b", joinedAt: 1, weight: 1 },
      { userId: "c", joinedAt: 2, weight: 1 },
    ]);
    expect(rows).toEqual([
      { userId: "a", amount: 5000 },
      { userId: "b", amount: 2500 },
      { userId: "c", amount: 2500 },
    ]);
  });

  it("se stejnými váhami se chová jako rovný díl", () => {
    const weighted = splitShares(10000, [
      { userId: "a", joinedAt: 0, weight: 1 },
      { userId: "b", joinedAt: 1, weight: 1 },
      { userId: "c", joinedAt: 2, weight: 1 },
    ]);
    expect(weighted).toEqual(splitEqual(10000, P("a", "b", "c")));
  });

  it("rozdá zbytkové haléře metodou největšího zbytku a součet sedí", () => {
    const rows = splitShares(10001, [
      { userId: "a", joinedAt: 0, weight: 3 },
      { userId: "b", joinedAt: 1, weight: 1 },
      { userId: "c", joinedAt: 2, weight: 1 },
    ]);
    expect(rows).toEqual([
      { userId: "a", amount: 6001 },
      { userId: "b", amount: 2000 },
      { userId: "c", amount: 2000 },
    ]);
    expect(sum(rows)).toBe(10001);
  });

  it("odmítne nulovou nebo zápornou váhu", () => {
    expect(() =>
      splitShares(10000, [
        { userId: "a", joinedAt: 0, weight: 1 },
        { userId: "b", joinedAt: 1, weight: 0 },
      ]),
    ).toThrow();
  });

  // Review round 1, Finding 1 (CRITICAL): `!(p.weight! > 0)` propustilo
  // Infinity i astronomicky velké konečné váhy — `amount * weight` pak
  // přeteklo na Infinity/NaN a takové řádky se v tichosti zapsaly do DB.
  it("odmítne nekonečnou váhu", () => {
    expect(() =>
      splitShares(10000, [
        { userId: "a", joinedAt: 0, weight: Infinity },
        { userId: "b", joinedAt: 1, weight: 1 },
      ]),
    ).toThrow();
  });

  it("odmítne NaN váhu", () => {
    expect(() =>
      splitShares(10000, [
        { userId: "a", joinedAt: 0, weight: NaN },
        { userId: "b", joinedAt: 1, weight: 1 },
      ]),
    ).toThrow();
  });

  it("odmítne astronomicky velkou, ale konečnou váhu, která by amount*weight přetekla na Infinity", () => {
    expect(() =>
      splitShares(10000, [
        { userId: "a", joinedAt: 0, weight: 1e308 },
        { userId: "b", joinedAt: 1, weight: 1 },
      ]),
    ).toThrow();
  });

  it("přijme rozumně velkou váhu a součet pořád sedí", () => {
    const rows = splitShares(10000, [
      { userId: "a", joinedAt: 0, weight: 1_000_000 },
      { userId: "b", joinedAt: 1, weight: 1 },
    ]);
    expect(sum(rows)).toBe(10000);
  });

  it("odmítne částku mimo bezpečný rozsah celých čísel", () => {
    expect(() =>
      splitShares(Number.MAX_SAFE_INTEGER + 2, [{ userId: "a", joinedAt: 0, weight: 1 }]),
    ).toThrow();
  });

  it("součet sedí pro různé částky a váhové poměry", () => {
    const weightVectors: number[][] = [
      [1],
      [1, 1],
      [1, 2],
      [1, 1, 1],
      [3, 1, 1],
      [5, 3, 2],
      [7, 5, 3, 2, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];
    for (const weights of weightVectors) {
      const participants = weights.map((weight, i) => ({
        userId: "abcdefghij"[i],
        joinedAt: i,
        weight,
      }));
      for (let amount = 1; amount <= 2000; amount++) {
        expect(sum(splitShares(amount, participants))).toBe(amount);
      }
    }
  });
});

describe("validateExact", () => {
  it("projde, když součet sedí", () => {
    const entries = [
      { userId: "a", amount: 6000 },
      { userId: "b", amount: 4000 },
    ];
    expect(validateExact(10000, entries)).toEqual(entries);
  });

  it("spadne, když součet nesedí", () => {
    // ConvexError nese jen strojový kód, ne českou větu (produkce by ji
    // zredagovala) — test proto cílí na .data.code, ne na text zprávy.
    let error: unknown;
    try {
      validateExact(10000, [
        { userId: "a", amount: 6000 },
        { userId: "b", amount: 3999 },
      ]);
    } catch (e) {
      error = e;
    }
    expect(
      error instanceof ConvexError &&
        (error.data as { code?: string })?.code === "SPLIT_SUM_MISMATCH",
    ).toBe(true);
  });

  it("spadne na záporném podílu", () => {
    expect(() =>
      validateExact(10000, [
        { userId: "a", amount: 11000 },
        { userId: "b", amount: -1000 },
      ]),
    ).toThrow();
  });

  it("odmítne nulovou a zápornou částku, stejně jako rovný díl", () => {
    expect(() => validateExact(0, [{ userId: "a", amount: 0 }])).toThrow();
    expect(() => validateExact(-100, [{ userId: "a", amount: -100 }])).toThrow();
  });

  it("odmítne výdaj bez podílů, stejně jako rovný díl", () => {
    expect(() => validateExact(10000, [])).toThrow();
  });

  it("odmítne částku i podíl mimo bezpečný rozsah celých čísel", () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 2;
    expect(() => validateExact(unsafe, [{ userId: "a", amount: unsafe }])).toThrow();
    expect(() => validateExact(10000, [{ userId: "a", amount: unsafe }])).toThrow();
  });
});
