import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { signedInAs } from "../../tests/convexHelpers";
import { setupGroup } from "../../tests/fixtures";

const DEN = new Date("2026-09-10T12:00:00Z").getTime();

type Ctx = Awaited<ReturnType<typeof setupGroup>>;
type Person = Ctx["dejny"];

/** Výdaj rovným dílem: `payer` zaplatil `amount` haléřů za `participants`. */
async function spent(ctx: Ctx, payer: Person, amount: number, participants: Person[], title = "Výdaj") {
  return payer.asUser.mutation(api.expenses.create, {
    groupId: ctx.groupId,
    payerId: payer.userId,
    amount,
    title,
    categoryId: ctx.categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: participants.map((p) => ({ userId: p.userId })),
  });
}

/** Dejny zaplatil 100 Kč, skládají se on a Petr → Petr mu pošle 50 Kč. */
async function pizzaZaStovku() {
  const ctx = await setupGroup();
  await spent(ctx, ctx.dejny, 10000, [ctx.dejny, ctx.petr], "Pizza");
  return ctx;
}

/** Petr dluží Dejnymu 50 Kč a Dejny Janě 50 Kč → stačí, když Petr pošle 50 Kč rovnou Janě. */
async function retez() {
  const ctx = await pizzaZaStovku();
  await spent(ctx, ctx.jana, 10000, [ctx.jana, ctx.dejny], "Kino");
  return ctx;
}

const debtsOf = (ctx: Ctx) => ctx.dejny.asUser.query(api.settlements.debts, { groupId: ctx.groupId });

test("nevyrovnaný podíl se objeví jako převod správným směrem", async () => {
  const ctx = await pizzaZaStovku();
  expect(await debtsOf(ctx)).toEqual([
    expect.objectContaining({ from: ctx.petr.userId, to: ctx.dejny.userId, amount: 5000, fromNickname: "Petr", toNickname: "Dejny" }),
  ]);
});

test("dluhy přes prostředníka se zjednoduší na jeden převod", async () => {
  const ctx = await retez();
  expect(await debtsOf(ctx)).toEqual([
    expect.objectContaining({ from: ctx.petr.userId, to: ctx.jana.userId, amount: 5000 }),
  ]);
});

test("bilance ukážou, kdo má dostat a kdo zaplatit, i lidi na nule", async () => {
  const ctx = await retez();
  const rows = await ctx.petr.asUser.query(api.settlements.balances, { groupId: ctx.groupId });
  expect(rows.map((r) => [r.nickname, r.balance])).toEqual([
    ["Jana", 5000],
    ["Dejny", 0],
    ["Petr", -5000],
  ]);
});

test("zaplacený poslední převod uzavře partu a zamkne výdaje", async () => {
  const ctx = await retez();
  const settlementId = await ctx.petr.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.jana.userId,
    amount: 5000,
  });

  expect(await debtsOf(ctx)).toEqual([]);
  const splits = await ctx.t.run((db) => db.db.query("splits").collect());
  expect(splits.every((s) => s.settled)).toBe(true);
  expect(splits.filter((s) => s.userId !== s.payerId).every((s) => s.settlementId === settlementId)).toBe(true);

  const [expense] = await ctx.dejny.asUser.query(api.expenses.listForGroup, { groupId: ctx.groupId, period: "all" });
  await expect(ctx.dejny.asUser.mutation(api.expenses.remove, { expenseId: expense._id })).rejects.toMatchObject({
    data: { code: "EXPENSE_SETTLEMENT_LOCKED" },
  });
});

test("zaplacený převod, po kterém ještě něco zbývá, partu neuzavře", async () => {
  const ctx = await setupGroup();
  // Dejny zaplatil 300 za všechny tři → Petr i Jana mu pošlou po 100
  await spent(ctx, ctx.dejny, 30000, [ctx.dejny, ctx.petr, ctx.jana]);
  await ctx.petr.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.dejny.userId,
    amount: 10000,
  });

  expect(await debtsOf(ctx)).toEqual([
    expect.objectContaining({ from: ctx.jana.userId, to: ctx.dejny.userId, amount: 10000 }),
  ]);
  const splits = await ctx.t.run((db) => db.db.query("splits").collect());
  expect(splits.filter((s) => !s.settled)).toHaveLength(2);

  // nový výdaj po zaplacení se do bilancí normálně přičte: Dejny teď dluží
  // Petrovi 30, ale sám má od Jany dostat 100 → Jana pošle 70 jemu a 30 Petrovi
  await spent(ctx, ctx.petr, 6000, [ctx.petr, ctx.dejny]);
  expect(await debtsOf(ctx)).toEqual([
    expect.objectContaining({ from: ctx.jana.userId, to: ctx.dejny.userId, amount: 7000 }),
    expect.objectContaining({ from: ctx.jana.userId, to: ctx.petr.userId, amount: 3000 }),
  ]);
});

test("převod, který neodpovídá aktuálním dluhům, neprojde (ani podruhé zaplacený)", async () => {
  const ctx = await setupGroup();
  await spent(ctx, ctx.dejny, 30000, [ctx.dejny, ctx.petr, ctx.jana]);
  const args = { groupId: ctx.groupId, from: ctx.petr.userId, to: ctx.dejny.userId, amount: 10000 };

  await expect(
    ctx.petr.asUser.mutation(api.settlements.settleTransfer, { ...args, amount: 9999 }),
  ).rejects.toMatchObject({ data: { code: "DEBT_CHANGED" } });

  await ctx.petr.asUser.mutation(api.settlements.settleTransfer, args);
  await expect(ctx.dejny.asUser.mutation(api.settlements.settleTransfer, args)).rejects.toMatchObject({
    data: { code: "DEBT_CHANGED" },
  });
});

test("převod smí zaplatit jen jedna ze stran, ne přihlížející", async () => {
  const ctx = await pizzaZaStovku();
  await expect(
    ctx.jana.asUser.mutation(api.settlements.settleTransfer, {
      groupId: ctx.groupId,
      from: ctx.petr.userId,
      to: ctx.dejny.userId,
      amount: 5000,
    }),
  ).rejects.toMatchObject({ data: { code: "DEBT_NOT_YOURS" } });
});

test("vrácení platby vrátí dluh; u uzavírající platby otevře i podíly a ostatní převody", async () => {
  const ctx = await setupGroup();
  await spent(ctx, ctx.dejny, 30000, [ctx.dejny, ctx.petr, ctx.jana]);
  const first = await ctx.petr.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.dejny.userId,
    amount: 10000,
  });
  const last = await ctx.jana.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.jana.userId,
    to: ctx.dejny.userId,
    amount: 10000,
  });
  expect(await debtsOf(ctx)).toEqual([]);

  // první platba je uzavřená tou poslední — samostatně ji vrátit nejde
  await expect(
    ctx.petr.asUser.mutation(api.settlements.unsettleSettlement, { settlementId: first }),
  ).rejects.toMatchObject({ data: { code: "SETTLEMENT_CLOSED" } });

  await ctx.jana.asUser.mutation(api.settlements.unsettleSettlement, { settlementId: last });
  expect(await debtsOf(ctx)).toEqual([
    expect.objectContaining({ from: ctx.jana.userId, to: ctx.dejny.userId, amount: 10000 }),
  ]);
  const splits = await ctx.t.run((db) => db.db.query("splits").collect());
  expect(splits.filter((s) => !s.settled)).toHaveLength(2);

  // a teď už jde vrátit i ta první
  await ctx.petr.asUser.mutation(api.settlements.unsettleSettlement, { settlementId: first });
  expect(await debtsOf(ctx)).toHaveLength(2);
});

test("zrušit platbu smí jen jedna ze stran, ne přihlížející", async () => {
  const ctx = await pizzaZaStovku();
  const settlementId = await ctx.petr.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.dejny.userId,
    amount: 5000,
  });
  await expect(ctx.jana.asUser.mutation(api.settlements.unsettleSettlement, { settlementId })).rejects.toMatchObject({
    data: { code: "DEBT_NOT_YOURS" },
  });
});

test("zrušení neexistujícího vyrovnání selže", async () => {
  const ctx = await pizzaZaStovku();
  const settlementId = await ctx.petr.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.dejny.userId,
    amount: 5000,
  });
  await ctx.t.run(async (db) => db.db.delete(settlementId));
  await expect(ctx.dejny.asUser.mutation(api.settlements.unsettleSettlement, { settlementId })).rejects.toMatchObject({
    data: { code: "SETTLEMENT_NOT_FOUND" },
  });
});

test("staré vyrovnání dvojice (bez kind) se do bilancí nepočítá a jde zrušit", async () => {
  const ctx = await pizzaZaStovku();
  // stav po dřívějším settleAllWith: podíl vyrovnaný a svázaný se záznamem
  const settlementId = await ctx.t.run(async (db) => {
    const id = await db.db.insert("settlements", {
      groupId: ctx.groupId,
      fromUserId: ctx.petr.userId,
      toUserId: ctx.dejny.userId,
      amount: 5000,
      createdBy: ctx.petr.userId,
      createdAt: DEN,
    });
    const splits = await db.db.query("splits").collect();
    for (const s of splits) if (s.userId !== s.payerId) await db.db.patch(s._id, { settled: true, settlementId: id });
    return id;
  });
  expect(await debtsOf(ctx)).toEqual([]);

  await ctx.dejny.asUser.mutation(api.settlements.unsettleSettlement, { settlementId });
  expect(await debtsOf(ctx)).toEqual([expect.objectContaining({ from: ctx.petr.userId, amount: 5000 })]);
});

test("historie vyrovnání vrací přezdívky obou stran", async () => {
  const ctx = await retez();
  await ctx.jana.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.jana.userId,
    amount: 5000,
  });

  const history = await ctx.dejny.asUser.query(api.settlements.listForGroup, { groupId: ctx.groupId });
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    kind: "transfer",
    fromUserId: ctx.petr.userId,
    toUserId: ctx.jana.userId,
    amount: 5000,
    fromNickname: "Petr",
    toNickname: "Jana",
  });
});

test("nečlen dluhy, bilance ani historii party nevidí", async () => {
  const ctx = await pizzaZaStovku();
  const cizi = await signedInAs(ctx.t, { nickname: "Cizí" });
  for (const fn of [api.settlements.debts, api.settlements.balances, api.settlements.listForGroup]) {
    await expect(cizi.asUser.query(fn, { groupId: ctx.groupId })).rejects.toMatchObject({
      data: { code: "NOT_MEMBER" },
    });
  }
});

test("platby ve feedu se filtrují podle období, kdy se zaplatily", async () => {
  const ctx = await pizzaZaStovku();
  await ctx.petr.asUser.mutation(api.settlements.settleTransfer, {
    groupId: ctx.groupId,
    from: ctx.petr.userId,
    to: ctx.dejny.userId,
    amount: 5000,
  });
  const q = (period: "thisMonth" | "lastMonth" | "all") =>
    ctx.dejny.asUser.query(api.settlements.listForGroup, { groupId: ctx.groupId, period });
  expect(await q("thisMonth")).toHaveLength(1);
  expect(await q("all")).toHaveLength(1);
  expect(await q("lastMonth")).toHaveLength(0);
});
