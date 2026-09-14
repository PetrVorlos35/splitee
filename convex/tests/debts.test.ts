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

  it("otočí směr dluhu, když nevyrovnaný zbytek běží opačně, než přišel první záznam", () => {
    // dvojice "a>b" se do mapy zapíše dřív (10000), ale "b>a" je větší (30000) —
    // čistý dluh tedy míří od b k a, ne od a k b.
    expect(
      aggregateDebts([
        { debtorId: "a", creditorId: "b", amount: 10000 },
        { debtorId: "b", creditorId: "a", amount: 30000 },
      ]),
    ).toEqual([{ from: "b", to: "a", amount: 20000 }]);
  });

  it("řadí stejně velké dluhy deterministicky bez ohledu na pořadí vstupu", () => {
    const order1 = aggregateDebts([
      { debtorId: "b", creditorId: "x", amount: 500 },
      { debtorId: "a", creditorId: "x", amount: 500 },
    ]);
    const order2 = aggregateDebts([
      { debtorId: "a", creditorId: "x", amount: 500 },
      { debtorId: "b", creditorId: "x", amount: 500 },
    ]);
    expect(order1).toEqual(order2);
    expect(order1).toEqual([
      { from: "a", to: "x", amount: 500 },
      { from: "b", to: "x", amount: 500 },
    ]);
  });
});
