import { describe, expect, it } from "vitest";
import { netBalances, simplifyDebts, type Debt } from "../lib/debts";

/** Pošle převody a vrátí, co komu zbylo — po zjednodušení musí být všichni na nule. */
function applyTransfers(balances: Map<string, number>, transfers: Debt[]) {
  const left = new Map(balances);
  for (const { from, to, amount } of transfers) {
    left.set(from, (left.get(from) ?? 0) + amount);
    left.set(to, (left.get(to) ?? 0) - amount);
  }
  return [...left.values()].filter((v) => v !== 0);
}

describe("netBalances", () => {
  it("sečte podíly do bilancí, plátce v plusu, dlužník v mínusu", () => {
    const balances = netBalances([
      { debtorId: "petr", creditorId: "ja", amount: 34000 },
      { debtorId: "petr", creditorId: "ja", amount: 12000 },
      { debtorId: "ja", creditorId: "jana", amount: 8000 },
    ]);
    expect(Object.fromEntries(balances)).toEqual({ ja: 38000, petr: -46000, jana: 8000 });
  });

  it("ignoruje podíl plátce sám sobě a vynechá lidi na nule", () => {
    const balances = netBalances([
      { debtorId: "a", creditorId: "a", amount: 5000 },
      { debtorId: "a", creditorId: "b", amount: 100 },
      { debtorId: "b", creditorId: "a", amount: 100 },
    ]);
    expect(balances.size).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("kdo má dostat, už nikomu neposílá (mám dostat 270, dlužím 5 → dostanu 265)", () => {
    const balances = netBalances([
      { debtorId: "petr", creditorId: "ja", amount: 27000 },
      { debtorId: "ja", creditorId: "jana", amount: 500 },
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { from: "petr", to: "ja", amount: 26500 },
      { from: "petr", to: "jana", amount: 500 },
    ]);
  });

  it("řetěz a → b → c zkrátí na jediný převod a → c", () => {
    const balances = netBalances([
      { debtorId: "a", creditorId: "b", amount: 10000 },
      { debtorId: "b", creditorId: "c", amount: 10000 },
    ]);
    expect(simplifyDebts(balances)).toEqual([{ from: "a", to: "c", amount: 10000 }]);
  });

  it("přednostně spáruje přesně sedící dluh a pohledávku", () => {
    // hladově by šlo a(−500)→x(+400) a pak a→y, b→y; přesná shoda a→y ušetří převod
    const balances = new Map([
      ["a", -500],
      ["b", -400],
      ["x", 400],
      ["y", 500],
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { from: "a", to: "y", amount: 500 },
      { from: "b", to: "x", amount: 400 },
    ]);
  });

  it("vrátí prázdno, když není co vyrovnávat", () => {
    expect(simplifyDebts(new Map())).toEqual([]);
  });

  it("je deterministické bez ohledu na pořadí vstupu", () => {
    const a = new Map([["c", 300], ["a", -200], ["b", -100]]);
    const b = new Map([["b", -100], ["a", -200], ["c", 300]]);
    expect(simplifyDebts(a)).toEqual(simplifyDebts(b));
  });

  it("vždy sedí na haléř a má nejvýš n − 1 převodů", () => {
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let round = 0; round < 200; round++) {
      const people = 2 + Math.floor(rand() * 9);
      const raw = Array.from({ length: 1 + Math.floor(rand() * 30) }, () => ({
        debtorId: `u${Math.floor(rand() * people)}`,
        creditorId: `u${Math.floor(rand() * people)}`,
        amount: 1 + Math.floor(rand() * 100000),
      }));
      const balances = netBalances(raw);
      const transfers = simplifyDebts(balances);
      expect(applyTransfers(balances, transfers)).toEqual([]);
      expect(transfers.length).toBeLessThanOrEqual(Math.max(0, balances.size - 1));
      expect(transfers.every((t) => t.amount > 0 && Number.isInteger(t.amount) && t.from !== t.to)).toBe(true);
    }
  });
});
