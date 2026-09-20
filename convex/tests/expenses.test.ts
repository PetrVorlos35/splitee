import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { signedInAs } from "../../tests/convexHelpers";
import { setupGroup } from "../../tests/fixtures";
import { MAX_AMOUNT_HALERU } from "../lib/money";

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

// Review round 2, Finding 4: settlementId sám nepokrývá Task 7's
// `settleSplit` (běžný "zaplaceno" checkbox) ani `settleAllWith` u
// nulového zůstatku — obojí nastaví jen settled/settledAt, settlementId
// nikdy. Petrův podíl je tu vyrovnaný přesně takhle (bez settlementId) —
// dřív tenhle test tvrdil, že smazání i tak projde (díra), teď musí
// tvrdit, že je zamčené, jinak by smazání/oprava výdaje tiše zrušila
// reálně zaplacené peníze beze stopy.
test("smazání výdaje se settled podílem bez settlementId je zamčené (settleSplit cesta)", async () => {
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

  // simulace Task 7's settleSplit: patch(splitId, { settled: true,
  // settledAt }), bez settlements řádku a bez settlementId
  await t.run(async (ctx) => {
    const split = await ctx.db
      .query("splits")
      .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
      .filter((q) => q.eq(q.field("userId"), petr.userId))
      .first();
    await ctx.db.patch(split!._id, { settled: true, settledAt: Date.now() });
  });

  await expect(dejny.asUser.mutation(api.expenses.remove, { expenseId })).rejects.toMatchObject({
    data: { code: "EXPENSE_SETTLEMENT_LOCKED" },
  });

  // výdaj i podíly přežily pokus o smazání
  const rows = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(rows).toHaveLength(1);
  expect(rows[0].splits).toHaveLength(2);
});

// Task 7: dřív se tahle větev zámku prokazovala jen přes `remove` a přes
// ruční `ctx.db.patch` simulující settleSplit (test výš). Teď existuje
// skutečná `api.settlements.settleSplit` — tenhle test jde touhle reálnou
// cestou a zamyká `update`, ne `remove`, aby byla widened edit-lock
// (Task 6, review round 2) prokázaná na obou mutacích, ne jen na jedné.
test("úprava výdaje se settled podílem bez settlementId je zamčená (skutečná settleSplit cesta)", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

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

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  const petrSplitId = expense.splits.find((s) => s.userId === petr.userId)!._id;
  await petr.asUser.mutation(api.settlements.settleSplit, { splitId: petrSplitId });

  await expect(
    dejny.asUser.mutation(api.expenses.update, {
      expenseId,
      payerId: dejny.userId,
      amount: 8000,
      title: "Pizza upravená",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "EXPENSE_SETTLEMENT_LOCKED" } });

  // nic se nezměnilo
  const [unchanged] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(unchanged.title).toBe("Pizza");
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

// --- Review round 1, Finding 2: update/remove/listForGroup neměly žádný test na členství ---

test("nečlen výdaj neupraví", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();
  const cizi = await signedInAs(t, { nickname: "Cizí" });

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

  await expect(
    cizi.asUser.mutation(api.expenses.update, {
      expenseId,
      payerId: dejny.userId,
      amount: 5000,
      title: "Přepsáno cizím",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "NOT_MEMBER" } });
});

test("nečlen výdaj nesmaže", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();
  const cizi = await signedInAs(t, { nickname: "Cizí" });

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

  await expect(cizi.asUser.mutation(api.expenses.remove, { expenseId })).rejects.toMatchObject({
    data: { code: "NOT_MEMBER" },
  });

  // výdaj opravdu přežil pokus o smazání cizím
  const rows = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(rows).toHaveLength(1);
});

test("nečlen nevidí feed cizí party přes listForGroup", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();
  const cizi = await signedInAs(t, { nickname: "Cizí" });

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

  await expect(
    cizi.asUser.query(api.expenses.listForGroup, { groupId, period: "all" }),
  ).rejects.toMatchObject({ data: { code: "NOT_MEMBER" } });
});

// --- Review round 1, Finding 6: categoryId se nekontrolovalo proti partě ---

test("kategorie z jiné party se odmítne", async () => {
  const { groupId, dejny, petr } = await setupGroup();

  // Druhá parta ve STEJNÉ testovací databázi (`t` z týž setupGroup) —
  // volání setupGroup() podruhé by založilo úplně oddělenou convex-test
  // instanci (vlastní newTest()), takže by ID z ní nebylo v prvním `t`
  // vůbec smysluplně "cizí" (ID nejsou mezi instancemi přenositelná).
  // Tohle je navíc realističtější scénář: Dejny je členem obou part a
  // popletl kategorii z jedné se založením výdaje ve druhé.
  const otherGroupId = await dejny.asUser.mutation(api.groups.create, {
    name: "Jiná parta",
    emoji: "🎒",
    currency: "CZK",
  });
  const otherCategories = await dejny.asUser.query(api.categories.listForGroup, {
    groupId: otherGroupId,
  });

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Pizza",
      categoryId: otherCategories[0]._id,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "CATEGORY_NOT_IN_GROUP" } });
});

// Review round 2: assertCategoryInGroup se testovalo jen na create, update
// má vlastní volání se stejnou kontrolou (jiný groupId zdroj — expense.groupId
// místo args.groupId) a bylo bez pokrytí.
test("kategorie z jiné party se odmítne i při úpravě výdaje", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

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

  const otherGroupId = await dejny.asUser.mutation(api.groups.create, {
    name: "Jiná parta",
    emoji: "🎒",
    currency: "CZK",
  });
  const otherCategories = await dejny.asUser.query(api.categories.listForGroup, {
    groupId: otherGroupId,
  });

  await expect(
    dejny.asUser.mutation(api.expenses.update, {
      expenseId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Pizza",
      categoryId: otherCategories[0]._id,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "CATEGORY_NOT_IN_GROUP" } });
});

// --- Review round 1, Finding 4: úprava/smazání výdaje s vyrovnaným podílem přes settlement ---

test("výdaj s podílem vyrovnaným přes settlement nejde upravit ani smazat", async () => {
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

  // simulace Task 7: Petrův podíl je vyrovnaný přes konkrétní settlement,
  // ne jen ručně odškrtnutý — jen settlementId má reálný výdaj zamknout
  const settlementId = await t.run(async (ctx) =>
    ctx.db.insert("settlements", {
      groupId,
      fromUserId: petr.userId,
      toUserId: dejny.userId,
      amount: 5000,
      createdBy: dejny.userId,
      createdAt: Date.now(),
    }),
  );
  await t.run(async (ctx) => {
    const split = await ctx.db
      .query("splits")
      .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
      .filter((q) => q.eq(q.field("userId"), petr.userId))
      .first();
    await ctx.db.patch(split!._id, { settled: true, settledAt: Date.now(), settlementId });
  });

  await expect(
    dejny.asUser.mutation(api.expenses.update, {
      expenseId,
      payerId: dejny.userId,
      amount: 8000,
      title: "Pizza upravená",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "EXPENSE_SETTLEMENT_LOCKED" } });

  await expect(dejny.asUser.mutation(api.expenses.remove, { expenseId })).rejects.toMatchObject({
    data: { code: "EXPENSE_SETTLEMENT_LOCKED" },
  });

  // nic se nezměnilo — ani title, ani počet podílů
  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.title).toBe("Pizza");
  expect(expense.splits).toHaveLength(2);
});

// --- Review round 1, Finding 1 (CRITICAL): NaN/Infinity, "same family" spentAt ---

test("nekonečná váha v shares režimu neprojde ani přes mutaci", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Rozbité váhy",
      categoryId,
      spentAt: DEN,
      splitMode: "shares",
      participants: [
        { userId: dejny.userId, weight: Infinity },
        { userId: petr.userId, weight: 1 },
      ],
    }),
  ).rejects.toMatchObject({ data: { code: "WEIGHT_INVALID" } });

  // a nic se nezaložilo — žádný NaN/Infinity řádek v expenses ani splits
  expect(await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" })).toEqual([]);
});

test("NaN datum útraty neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Rozbité datum",
      categoryId,
      spentAt: NaN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "SPENT_AT_INVALID" } });
});

// Task 7: hranice `Number.isSafeInteger(spentAt) && spentAt >= 0` (round 2)
// dřív neměla test na konečné, ale mimo rozsah hodnoty — přesně ty, na které
// Number.isFinite samo o sobě nestačí (viz komentář u writeSplits).
test("datum útraty mimo bezpečný rozsah čísel neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Datum z budoucnosti mimo bezpečná čísla",
      categoryId,
      spentAt: 1e16,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "SPENT_AT_INVALID" } });
});

test("záporné datum útraty neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Datum před rokem 1970",
      categoryId,
      spentAt: -1,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "SPENT_AT_INVALID" } });
});

// --- Review round 1, Finding 8: nedotestované kódy a dvě atomicity/pořadí tvrzení ---

test("duplicitní účastník neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Duplikát",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "PARTICIPANT_DUPLICATE" } });
});

test("přesné dělení bez zadané částky u účastníka neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Chybí částka",
      categoryId,
      spentAt: DEN,
      splitMode: "exact",
      participants: [{ userId: dejny.userId, amount: 10000 }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "SPLIT_AMOUNT_MISSING" } });
});

test("prázdný název výdaje neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "   ",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "EXPENSE_TITLE_EMPTY" } });
});

test("částka nad MAX_AMOUNT_HALERU neprojde", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: MAX_AMOUNT_HALERU + 1,
      title: "Moc peněz",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "AMOUNT_TOO_LARGE" } });
});

test("úprava neexistujícího výdaje neprojde", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();

  const expenseId = await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Smaže se",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });
  await t.run(async (ctx) => ctx.db.delete(expenseId));

  await expect(
    dejny.asUser.mutation(api.expenses.update, {
      expenseId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Duch",
      categoryId,
      spentAt: DEN,
      splitMode: "equal",
      participants: [{ userId: dejny.userId }, { userId: petr.userId }],
    }),
  ).rejects.toMatchObject({ data: { code: "EXPENSE_NOT_FOUND" } });
});

test("nepovedené založení výdaje nenechá osiřelý řádek v expenses (atomicita)", async () => {
  const { t, groupId, dejny, petr, categoryId } = await setupGroup();

  await expect(
    dejny.asUser.mutation(api.expenses.create, {
      groupId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Rozbitý součet",
      categoryId,
      spentAt: DEN,
      splitMode: "exact",
      participants: [
        { userId: dejny.userId, amount: 7000 },
        { userId: petr.userId, amount: 2000 }, // nesedí na 10000
      ],
    }),
  ).rejects.toMatchObject({ data: { code: "SPLIT_SUM_MISMATCH" } });

  const expenses = await t.run(async (ctx) => ctx.db.query("expenses").collect());
  expect(expenses).toEqual([]);
  const splits = await t.run(async (ctx) => ctx.db.query("splits").collect());
  expect(splits).toEqual([]);
});

test("nepovedená úprava nezmění stávající výdaj ani podíly (transakce se vrátí celá)", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

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

  const before = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });

  await expect(
    dejny.asUser.mutation(api.expenses.update, {
      expenseId,
      payerId: dejny.userId,
      amount: 10000,
      title: "Pokus o rozbití",
      categoryId,
      spentAt: DEN,
      splitMode: "exact",
      participants: [
        { userId: dejny.userId, amount: 7000 },
        { userId: petr.userId, amount: 2000 }, // nesedí na 10000
      ],
    }),
  ).rejects.toMatchObject({ data: { code: "SPLIT_SUM_MISMATCH" } });

  const after = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(after).toEqual(before);
});

test("pořadí participants ve vstupu neovlivní, kdo dostane zbytkový haléř", async () => {
  const { groupId, dejny, petr, jana, categoryId } = await setupGroup();

  // Dejny (owner) vstoupil první, pak Petr, pak Jana — účastníci ve
  // výdaji jsou schválně v obráceném pořadí, aby test dokázal, že se
  // zbytkový haléř řídí joinedAt (writeSplits ho dohledá z memberships),
  // ne pořadím, ve kterém je klient poslal.
  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 1,
    title: "Haléř",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: jana.userId }, { userId: petr.userId }, { userId: dejny.userId }],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.splits.find((s) => s.userId === dejny.userId)?.amount).toBe(1);
  expect(expense.splits.find((s) => s.userId === petr.userId)?.amount).toBe(0);
  expect(expense.splits.find((s) => s.userId === jana.userId)?.amount).toBe(0);
});

// --- Review round 1, Finding 3: úprava nenechávala stopu, kdo ji udělal ---

test("úprava nastaví updatedBy/updatedAt, založení je nechá prázdné", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

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

  const [afterCreate] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(afterCreate.updatedBy).toBeUndefined();
  expect(afterCreate.updatedAt).toBeUndefined();
  expect(afterCreate.createdBy).toBe(dejny.userId);

  // Petr (jiný člen party, ne autor) opraví Dejnyho zápis
  await petr.asUser.mutation(api.expenses.update, {
    expenseId,
    payerId: dejny.userId,
    amount: 12000,
    title: "Pizza, opraveno",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: dejny.userId }, { userId: petr.userId }],
  });

  const [afterUpdate] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(afterUpdate.createdBy).toBe(dejny.userId); // autor se nepřepisuje
  expect(afterUpdate.updatedBy).toBe(petr.userId);
  expect(typeof afterUpdate.updatedAt).toBe("number");
});

// --- Review round 1, Minor: weight se neměl ukládat mimo shares režim ---

test("weight se uloží jen v shares režimu, v equal/exact se zahodí", async () => {
  const { groupId, dejny, petr, categoryId } = await setupGroup();

  await dejny.asUser.mutation(api.expenses.create, {
    groupId,
    payerId: dejny.userId,
    amount: 10000,
    title: "Se zbytečnou váhou",
    categoryId,
    spentAt: DEN,
    splitMode: "equal",
    // weight u equal režimu nedává smysl, ale API typ ho nezakazuje —
    // nesmí přežít do DB, jinak zmate Task 9's edit formulář
    participants: [
      { userId: dejny.userId, weight: 7 },
      { userId: petr.userId, weight: 3 },
    ],
  });

  const [expense] = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expense.splits.every((s) => s.weight === undefined)).toBe(true);
});
