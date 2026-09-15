import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireMembership, requireUser } from "./guards";
import { splitEqual, splitShares, validateExact } from "./lib/split";
import { periodRange } from "./lib/period";
import { MAX_AMOUNT_HALERU } from "./lib/money";
import { ERROR } from "../lib/errors";

const participantValidator = v.object({
  userId: v.id("users"),
  weight: v.optional(v.number()),
  amount: v.optional(v.number()),
});

const splitModeValidator = v.union(v.literal("equal"), v.literal("exact"), v.literal("shares"));
const periodValidator = v.union(v.literal("thisMonth"), v.literal("lastMonth"), v.literal("all"));

type ParticipantInput = { userId: Id<"users">; weight?: number; amount?: number };

/** categoryId musí patřit do stejné party, jinak by výdaj tiše skončil s category: null v listForGroup. */
async function assertCategoryInGroup(ctx: MutationCtx, categoryId: Id<"categories">, groupId: Id<"groups">) {
  const category = await ctx.db.get(categoryId);
  if (category === null || category.groupId !== groupId) {
    throw new ConvexError({ code: ERROR.CATEGORY_NOT_IN_GROUP });
  }
}

/**
 * Spočítá podíly a zapíše je. Volá se při založení i při úpravě výdaje —
 * při úpravě se staré podíly nejdřív smažou (viz `deleteSplits`), nikdy se
 * nepatchují, protože nesou denormalizované payerId a spentAt (schema.ts).
 */
async function writeSplits(
  ctx: MutationCtx,
  args: {
    expenseId: Id<"expenses">;
    groupId: Id<"groups">;
    payerId: Id<"users">;
    amount: number;
    spentAt: number;
    splitMode: "equal" | "exact" | "shares";
    participants: ParticipantInput[];
  },
) {
  // Horní hranice žije v convex/lib/money.ts (spolu s parseAmount, který ji
  // hlídá na formulářovém vstupu) — tady je poslední obrana proti volání
  // mutace přímo, mimo formulář, s nesmyslně velkou částkou. Dolní hranici
  // (kladné celé číslo) hlídá až assertAmount uvnitř split.ts.
  if (args.amount > MAX_AMOUNT_HALERU) {
    throw new ConvexError({ code: ERROR.AMOUNT_TOO_LARGE });
  }
  // Review round 1, Finding 1 (CRITICAL, "same family"): NaN/±Infinity by
  // Convex uloží (Float64 na drátě), a Convex řadí NaN nad +Infinity — takový
  // výdaj by vypadl z každého period rozsahu (i "all"), zatímco jeho podíly
  // by dál generovaly dluhy. Musí to být konečné číslo.
  if (!Number.isFinite(args.spentAt)) {
    throw new ConvexError({ code: ERROR.SPENT_AT_INVALID });
  }
  if (args.participants.length === 0) {
    throw new ConvexError({ code: ERROR.NO_PARTICIPANTS });
  }

  // Plný .collect() nad celou partou, ne .take()/.count() — potřebujeme
  // joinedAt každého člena (viz níž), a stejný plný index-range čtení navíc
  // dává OCC konfliktní interval, který pokrývá i další zápisy do stejné
  // party (stejný důvod jako u joinByCode v convex/groups.ts:117-126).
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
    .collect();
  const joinedAt = new Map(memberships.map((m) => [m.userId as string, m.joinedAt]));

  // Plátce nemusí být mezi participants (zaplatil, sám se neskládá) — ale
  // musí to být člen party, stejně jako každý účastník.
  if (!joinedAt.has(args.payerId)) throw new ConvexError({ code: ERROR.NOT_MEMBER });
  for (const p of args.participants) {
    if (!joinedAt.has(p.userId)) throw new ConvexError({ code: ERROR.NOT_MEMBER });
  }
  if (new Set(args.participants.map((p) => p.userId)).size !== args.participants.length) {
    throw new ConvexError({ code: ERROR.PARTICIPANT_DUPLICATE });
  }

  const withOrder = args.participants.map((p) => ({
    userId: p.userId as string,
    joinedAt: joinedAt.get(p.userId)!,
    weight: p.weight,
  }));

  const rows =
    args.splitMode === "equal"
      ? splitEqual(args.amount, withOrder)
      : args.splitMode === "shares"
        ? splitShares(args.amount, withOrder)
        : validateExact(
            args.amount,
            args.participants.map((p) => {
              if (p.amount === undefined) {
                throw new ConvexError({ code: ERROR.SPLIT_AMOUNT_MISSING });
              }
              return { userId: p.userId as string, amount: p.amount };
            }),
          );

  const weights = new Map(args.participants.map((p) => [p.userId as string, p.weight]));

  await Promise.all(
    rows.map((row) =>
      ctx.db.insert("splits", {
        expenseId: args.expenseId,
        groupId: args.groupId,
        userId: row.userId as Id<"users">,
        payerId: args.payerId,
        spentAt: args.spentAt,
        amount: row.amount,
        // jen v shares režimu má weight smysl — v equal/exact by uložená
        // váha z klienta matla Task 9's edit formulář, který podle ní
        // repopuluje UI (review round 1, Minor)
        weight: args.splitMode === "shares" ? weights.get(row.userId) : undefined,
        // plátce sám sobě nedluží, jeho podíl je vyrovnaný od začátku
        settled: row.userId === args.payerId,
        settledAt: row.userId === args.payerId ? Date.now() : undefined,
      }),
    ),
  );
}

/**
 * Smaže podíly výdaje. Spadne, pokud je některý z nich navázaný na
 * settlement (settlementId) — smazáním/přepsáním by `settlements` řádek
 * zůstal ukazovat na neexistující splits a Task 7 by znovu naúčtoval dluh,
 * který už byl vyrovnaný (review round 1, Finding 4). Dnes settlementId
 * nikdy nikdo nenastavuje (Task 7 ještě není), takže je tahle větev
 * nedosažitelná — připravená dopředu, aby ji Task 7 zdědil hotovou.
 */
async function deleteSplits(ctx: MutationCtx, expenseId: Id<"expenses">) {
  const splits = await ctx.db
    .query("splits")
    .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
    .collect();
  if (splits.some((s) => s.settlementId !== undefined)) {
    throw new ConvexError({ code: ERROR.EXPENSE_SETTLEMENT_LOCKED });
  }
  await Promise.all(splits.map((s) => ctx.db.delete(s._id)));
}

/**
 * Založí výdaj a jeho podíly. Oprávnění: kdokoli z party (requireMembership) —
 * nemusí to být plátce ani žádný z účastníků, kterokoliv člen může zapsat
 * výdaj za kohokoli jiného v partě.
 */
export const create = mutation({
  args: {
    groupId: v.id("groups"),
    payerId: v.id("users"),
    amount: v.number(),
    title: v.string(),
    note: v.optional(v.string()),
    categoryId: v.id("categories"),
    spentAt: v.number(),
    splitMode: splitModeValidator,
    participants: v.array(participantValidator),
    source: v.optional(v.union(v.literal("manual"), v.literal("receipt"), v.literal("recurring"))),
    receiptImageUrl: v.optional(v.string()),
    receiptPublicId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.groupId);

    const title = args.title.trim();
    if (title.length === 0) throw new ConvexError({ code: ERROR.EXPENSE_TITLE_EMPTY });
    await assertCategoryInGroup(ctx, args.categoryId, args.groupId);

    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      payerId: args.payerId,
      amount: args.amount,
      title,
      note: args.note?.trim() || undefined,
      categoryId: args.categoryId,
      spentAt: args.spentAt,
      splitMode: args.splitMode,
      source: args.source ?? "manual",
      receiptImageUrl: args.receiptImageUrl,
      receiptPublicId: args.receiptPublicId,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Convex mutace je jedna transakce — když writeSplits spadne (např. na
    // SPLIT_SUM_MISMATCH), zahodí se i insert výdaje o pár řádků výš. Nikdy
    // tak nevznikne výdaj bez podílů.
    await writeSplits(ctx, { ...args, expenseId });
    return expenseId;
  },
});

/**
 * Upraví výdaj a přepíše jeho podíly. Oprávnění: kdokoli z party
 * (requireMembership) — stejně jako u create, úprava není omezená jen na
 * autora nebo plátce výdaje. V malé důvěryhodné partě je běžné, že kdokoli
 * opraví překlep v cizím zápisu — proto `updatedBy`/`updatedAt`, aby taková
 * úprava zůstala dohledatelná a nesplynula s `createdBy`.
 */
export const update = mutation({
  args: {
    expenseId: v.id("expenses"),
    payerId: v.id("users"),
    amount: v.number(),
    title: v.string(),
    note: v.optional(v.string()),
    categoryId: v.id("categories"),
    spentAt: v.number(),
    splitMode: splitModeValidator,
    participants: v.array(participantValidator),
  },
  handler: async (ctx, args) => {
    // Přihlášení se ověří dřív, než cokoli prozradíme o tom, jestli
    // expenseId vůbec existuje — jinak by EXPENSE_NOT_FOUND vs. výsledek
    // requireMembership nechtěně fungovalo jako oracle na existenci ID i
    // bez přihlášení.
    const userId = await requireUser(ctx);
    const expense = await ctx.db.get(args.expenseId);
    if (expense === null) throw new ConvexError({ code: ERROR.EXPENSE_NOT_FOUND });
    await requireMembership(ctx, expense.groupId);

    const title = args.title.trim();
    if (title.length === 0) throw new ConvexError({ code: ERROR.EXPENSE_TITLE_EMPTY });
    await assertCategoryInGroup(ctx, args.categoryId, expense.groupId);

    // podíly se vždy zahodí a spočítají znovu — nikdy se nepatchují, nesou
    // denormalizované payerId i spentAt (viz schema.ts u tabulky splits).
    // deleteSplits spadne dřív, než cokoli přepíšeme, pokud je expense
    // zamčený vyrovnaným podílem (viz jeho komentář).
    await deleteSplits(ctx, args.expenseId);

    await ctx.db.patch(args.expenseId, {
      payerId: args.payerId,
      amount: args.amount,
      title,
      note: args.note?.trim() || undefined,
      categoryId: args.categoryId,
      spentAt: args.spentAt,
      splitMode: args.splitMode,
      updatedBy: userId,
      updatedAt: Date.now(),
    });

    await writeSplits(ctx, { ...args, groupId: expense.groupId });

    return null;
  },
});

/**
 * Smaže výdaj i jeho podíly. Oprávnění: kdokoli z party (requireMembership),
 * stejně jako create/update. Mazání neexistujícího výdaje je idempotentní
 * no-op (tichý úspěch) — ale až po ověření přihlášení, aby úspěch vs.
 * NOT_MEMBER nešlo použít jako oracle na existenci ID bez přihlášení.
 * Spadne, pokud má výdaj vyrovnaný podíl (viz `deleteSplits`).
 */
export const remove = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, { expenseId }) => {
    await requireUser(ctx);
    const expense = await ctx.db.get(expenseId);
    if (expense === null) return null;
    await requireMembership(ctx, expense.groupId);

    await deleteSplits(ctx, expenseId);
    await ctx.db.delete(expenseId);
    return null;
  },
});

/**
 * Výdaje party za dané období, od nejnovějšího, každý se svými podíly a
 * rozřešenou kategorií. `splits` je vždy pole (i prázdné by šlo nastat jen
 * chybou zápisu — invariant je, že každý výdaj má aspoň jeden podíl).
 * `category` je `null`, jen když byla kategorie mezitím smazaná/přesunutá —
 * dnes se kategorie nemažou, ale typ na to počítá dopředu.
 *
 * Jeden range dotaz na `splits.by_group_spentAt` místo jednoho dotazu na
 * expenseId (N+1) — funguje, protože `splits.spentAt` je vždy stejné jako
 * `expenses.spentAt` téhož výdaje (writeSplits ho na řádky splits otiskuje
 * ze stejné hodnoty, se kterou se zapisuje/patchuje expense), takže stejný
 * [from, to] rozsah vrátí přesně podíly patřící do vybraného období
 * (review round 1, Finding 5).
 */
export const listForGroup = query({
  args: { groupId: v.id("groups"), period: periodValidator },
  handler: async (ctx, { groupId, period }) => {
    await requireMembership(ctx, groupId);
    const { from, to } = periodRange(period, Date.now());

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_spentAt", (q) =>
        q.eq("groupId", groupId).gte("spentAt", from).lte("spentAt", to),
      )
      .order("desc")
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    const byId = new Map<string, Doc<"categories">>(categories.map((c) => [c._id, c]));

    const splits = await ctx.db
      .query("splits")
      .withIndex("by_group_spentAt", (q) =>
        q.eq("groupId", groupId).gte("spentAt", from).lte("spentAt", to),
      )
      .collect();
    const splitsByExpense = new Map<string, Doc<"splits">[]>();
    for (const split of splits) {
      const list = splitsByExpense.get(split.expenseId);
      if (list) list.push(split);
      else splitsByExpense.set(split.expenseId, [split]);
    }

    return expenses.map((expense) => ({
      ...expense,
      category: byId.get(expense.categoryId) ?? null,
      splits: splitsByExpense.get(expense._id) ?? [],
    }));
  },
});
