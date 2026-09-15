import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { signedInAs } from "../../tests/convexHelpers";
import { setupGroup } from "./fixtures";

const DEN = new Date("2026-09-10T12:00:00Z").getTime();

test("rovný díl založí podíl každému účastníkovi a součet sedí", async () => {
  const { groupId, dejny, petr, jana, categoryId } = await setupGroup();

  const expenseId = await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Pizza",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }, { userId: jana.userId }],
  });

  const rows = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  const expense = rows.find((r) => r._id === expenseId)!;

  expect(expense.splits).toHaveLength(3);
  expect(expense.splits.reduce((s, x) => s + x.amount, 0)).toBe(10000);
  expect(expense.category?.name).toBe("Jídlo");
});

test("podíl plátce je rovnou zaplacený, ostatní ne", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Pizza",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  const payerSplit = expense.splits.find((s) => s.userId === dejny.userId)!;
  const otherSplit = expense.splits.find((s) => s.userId === petr.userId)!;

  expect(payerSplit.settled).toBe(true);
  expect(otherSplit.settled).toBe(false);
});

test("podíly nesou denormalizované payerId a spentAt", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: petr.userId,
    amount: 5000,
    title: "Benzín",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  for (const split of expense.splits) {
    expect(split.payerId).toBe(petr.userId);
    expect(split.spentAt).toBe(DEN);
  }
});

test("přesné částky projdou, když sedí součet", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Nákup",
    categoryId,
    spentAt: DEN,
    splitMode: "exact",
    participants: [
      { userId: dejny.userId, amount: 7000 },
      { userId: petr.userId, amount: 3000 },
    ],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.splits.find((s) => s.userId === petr.userId)?.amount).toBe(3000);
});

test("přesné částky se součtem mimo spadnou", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  // ConvexError nese jen strojový kód (viz lib/errors.ts) — produkce by
  // text obyčejné Error zprávy zredagovala, test proto cílí na .data.code.
  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Nákup",
      categoryId,
      spentAt: DEN,
      splitMode: "exact",
      participants: [
        { userId: dejny.userId, amount: 7000 },
        { userId: petr.userId, amount: 2999 },
      ],
    }),
  ).rejects.toMatchObject({ data: { code: "SPLIT_SUM_MISMATCH" } });
});

test("podíly v poměru 2:1 rozdělí částku podle vah", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 9000,
    title: "Ubytování",
    categoryId,
    spentAt: DEN,
    splitMode: "shares",
    participants: [
      { userId: dejny.userId, weight: 2 },
      { userId: petr.userId, weight: 1 },
    ],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.splits.find((s) => s.userId === dejny.userId)?.amount).toBe(6000);
  expect(expense.splits.find((s) => s.userId === petr.userId)?.amount).toBe(3000);
});

test("nečlen výdaj nezaloží", async () => {
  const { t, groupId, dejny, categoryId } = await setupGroup();
  const cizi = await signedInAs(t, { nickname: "Cizí" });

  await expect(
    cizi.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Podvod",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }],
    }),
  ).rejects.toThrow();
});

test("účastník mimo partu neprojde", async () => {
  const { t, groupId, dejny, categoryId } = await setupGroup();
  const cizi = await signedInAs(t, { nickname: "Cizí" });

  // reuse ERROR.NOT_MEMBER — účastník mimo partu je tatáž podmínka jako
  // requireMembership, ne nový synonymní kód
  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Pizza",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: cizi.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "NOT_MEMBER" } });
});

test("plátce mimo partu neprojde", async () => {
  const { t, groupId, dejny, categoryId } = await setupGroup();
  const cizi = await signedInAs(t, { nickname: "Cizí" });

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: cizi.userId,
      amount: 10000,
      title: "Pizza",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "NOT_MEMBER" } });
});

test("výdaj bez účastníků neprojde", async () => {
  const { groupId, dejny, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Nic",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [],
    }),
  ).rejects.toThrow();
});

test("plátce, který sám není účastníkem, nedostane podíl a součet pořád sedí", async () => {
  const { groupId, dejny, petr, jana, categoryId } = await setupGroup();

  // Dejny zaplatil večeři pro Petra a Janu, sám nejedl — nemá být mezi
  // participants, a přesto se výdaj musí založit a součet sedět jen na
  // ty, kdo se skládají.
  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Večeře pro spolubydlící",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: petr.userId }, { userId: jana.userId }],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.splits).toHaveLength(2);
  expect(expense.splits.some((s) => s.userId === dejny.userId)).toBe(false);
  expect(expense.splits.reduce((s, x) => s + x.amount, 0)).toBe(10000);
  expect(expense.splits.every((s) => s.settled === false)).toBe(true);
});

test("úprava výdaje přepíše podíly a nenechá sirotky", async () => {
  const { groupId, dejny, petr, jana, categoryId } = await setupGroup();

  const expenseId = await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Pizza",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }, { userId: jana.userId }],
  });

  await dejny.asUser.mutation(api.expenses.update, {
    expenseId,
    payerId: petr.userId,
    amount: 6000,
    title: "Pizza a pivo",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.title).toBe("Pizza a pivo");
  expect(expense.splits).toHaveLength(2);
  expect(expense.splits.reduce((s, x) => s + x.amount, 0)).toBe(6000);
  // denormalizovaný plátce se musel přepsat spolu s podíly
  expect(expense.splits.every((s) => s.payerId === petr.userId)).toBe(true);
});

test("smazání výdaje smaže i jeho podíly", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();

  const expenseId = await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Pizza",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });

  await dejny.asUser.mutation(api.expenses.remove, { expenseId });

  expect(await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" })).toEqual([]);
  const orphans = await t.run(async (ctx) => ctx.db.query("splits").collect());
  expect(orphans).toEqual([]);
});

test("smazání výdaje se settled podílem taky nenechá sirotky", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();

  const expenseId = await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Pizza",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });

  // simulace: Petrův podíl už byl vyrovnaný (Task 7 by ho takhle označil)
  await t.run(async (ctx) => {
    const split = await ctx.db
      .query("splits")
      .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
      .filter((q) => q.eq(q.field("userId"), petr.userId))
      .first();
    await ctx.db.patch(split!._id, { settled: true, settledAt: Date.now() });
  });

  await dejny.asUser.mutation(api.expenses.remove, { expenseId });

  expect(await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" })).toEqual([]);
  const orphans = await t.run(async (ctx) => ctx.db.query("splits").collect());
  expect(orphans).toEqual([]);
});

test("období filtruje výdaje podle data útraty", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();
  const common = {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    categoryId,
    splitMode: "equal" as const,
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  };

  await dejny.asUser.mutation(api.expenses.create, {
    ...common,
    title: "Starý",
    spentAt: new Date("2020-01-15T12:00:00Z").getTime(),
  });
  await dejny.asUser.mutation(api.expenses.create, {
    ...common,
    title: "Nový",
    spentAt: Date.now(),
  });

  const all = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  const thisMonth = await dejny.asUser.query(api.expenses.listForGroup, {
    groupId,
    period: "thisMonth",
  });

  expect(all).toHaveLength(2);
  expect(thisMonth).toHaveLength(1);
  expect(thisMonth[0].title).toBe("Nový");
});

test("výdaje se vrací od nejnovějšího", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();
  const common = {
    groupId,
    payerId: dejny.userId,
    amount: 1000,
    categoryId,
    splitMode: "equal" as const,
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  };

  await dejny.asUser.mutation(api.expenses.create, { ...common, title: "Starší", spentAt: DEN });
  await dejny.asUser.mutation(api.expenses.create, {
    ...common,
    title: "Novější",
    spentAt: DEN + 86400000,
  });

  const rows = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(rows.map((r) => r.title)).toEqual(["Novější", "Starší"]);
});
