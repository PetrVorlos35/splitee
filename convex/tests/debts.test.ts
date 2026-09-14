import { describe, expect, it } from "vitest";
import { aggregateDebts } from "../lib/debts";

describe("aggregateDebts", () => {
  it("sečte víc nevyrovnaných podílů na jednu dvojici", () => {
    expect(
      aggregateDebts([
        { debtorId: "petr", creditorId: "ja", amount: 34000 },
        { debtorId: "petr", creditorId: "ja", amount: 12000 },
        { debtorId: "ja", creditorId: "jana", amount: 8000 },
      ]),
    ).toEqual([
      { from: "petr", to: "ja", amount: 46000 },
      { from: "ja", to: "jana", amount: 8000 },
    ]);
  });

  it("vyruší vzájemné dluhy a nechá jen rozdíl", () => {
    expect(
      aggregateDebts([
        { debtorId: "a", creditorId: "b", amount: 30000 },
        { debtorId: "b", creditorId: "a", amount: 10000 },
      ]),
    ).toEqual([{ from: "a", to: "b", amount: 20000 }]);
  });

  it("nezobrazí dvojici, která je po vyrušení na nule", () => {
    expect(
      aggregateDebts([
        { debtorId: "a", creditorId: "b", amount: 10000 },
        { debtorId: "b", creditorId: "a", amount: 10000 },
      ]),
    ).toEqual([]);
  });

  it("ignoruje podíl plátce sám sobě", () => {
    expect(aggregateDebts([{ debtorId: "a", creditorId: "a", amount: 5000 }])).toEqual([]);
  });

  it("řadí od největšího dluhu", () => {
    const rows = aggregateDebts([
      { debtorId: "a", creditorId: "x", amount: 100 },
      { debtorId: "b", creditorId: "x", amount: 900 },
      { debtorId: "c", creditorId: "x", amount: 500 },
    ]);
    expect(rows.map((r) => r.amount)).toEqual([900, 500, 100]);
  });

  it("vrátí prázdno, když není co vyrovnávat", () => {
    expect(aggregateDebts([])).toEqual([]);
  });
});
