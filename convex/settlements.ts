import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { isGuestOf, requireMembership } from "./guards";
import { netBalances, simplifyDebts } from "./lib/debts";
import { periodRange } from "./lib/period";
import { ERROR } from "../lib/errors";

/** Přezdívka a barva (klíč z lib/colors.ts, ne hex) každého člena party, pro popisky u dluhů/historie. */
async function memberLookup(ctx: QueryCtx, groupId: Id<"groups">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  const entries = await Promise.all(
    memberships.map(async (m) => {
      const user = await ctx.db.get(m.userId);
      return [
        m.userId as string,
        { nickname: user?.nickname ?? user?.name ?? "Někdo", color: m.color },
      ] as const;
    }),
  );

  return new Map(entries);
}

/**
 * Smí volající jednat za stranu dluhu? Ano, když je jednou ze stran, nebo
 * když je jednou ze stran host — ten se sám přihlásit nemůže, takže za něj
 * smí platby evidovat kdokoli z party (PRODUCT.md, Capabilities).
 */
async function canActOn(
  ctx: QueryCtx,
  callerId: Id<"users">,
  groupId: Id<"groups">,
  a: Id<"users">,
  b: Id<"users">,
) {
  if (callerId === a || callerId === b) return true;
  return (await isGuestOf(ctx, a, groupId)) || (await isGuestOf(ctx, b, groupId));
}

/**
 * Otevřené položky party: nevyrovnané podíly a zaplacené převody, které
 * ještě nejsou uzavřené (viz schema.ts u `settlements`). Z nich a jen z
 * nich vzniká bilance.
 */
async function openItems(ctx: QueryCtx, groupId: Id<"groups">) {
  const splits = await ctx.db
    .query("splits")
    .withIndex("by_group_settled", (q) => q.eq("groupId", groupId).eq("settled", false))
    .collect();
  const transfers = (
    await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect()
  ).filter((s) => s.kind === "transfer" && s.closedBy === undefined);
  return { splits, transfers };
}

/**
 * Bilance každého člena. Podíl = dlužník (`userId`) vůči plátci; zaplacený
 * převod od → komu je jako opačný dluh (kdo poslal, tomu se dluh zmenšil).
 */
function balancesOf({ splits, transfers }: Awaited<ReturnType<typeof openItems>>) {
  return netBalances([
    ...splits.map((s) => ({ debtorId: s.userId as string, creditorId: s.payerId as string, amount: s.amount })),
    ...transfers.map((s) => ({ debtorId: s.toUserId as string, creditorId: s.fromUserId as string, amount: s.amount })),
  ]);
}

/**
 * „Kdo komu kolik pošle" — zjednodušené převody z bilancí celé party
 * (convex/lib/debts.ts simplifyDebts), ne dluhy mezi jednotlivými dvojicemi.
 * `fromColor`/`toColor` jsou klíče z lib/colors.ts (`membership.color`), ne
 * hexy — zobrazovací vrstva si přes ně hex dohledá přes `colorByKey()`.
 */
export const debts = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireMembership(ctx, groupId);
    const balances = balancesOf(await openItems(ctx, groupId));
    const members = await memberLookup(ctx, groupId);

    return simplifyDebts(balances).map((debt) => ({
      from: debt.from as Id<"users">,
      to: debt.to as Id<"users">,
      amount: debt.amount,
      fromNickname: members.get(debt.from)?.nickname ?? "Někdo",
      fromColor: members.get(debt.from)?.color ?? "red",
      toNickname: members.get(debt.to)?.nickname ?? "Někdo",
      toColor: members.get(debt.to)?.color ?? "red",
    }));
  },
});

/**
 * Bilance všech členů — vysvětlení, odkud se zjednodušené převody berou.
 * Členové na nule jsou taky (s 0), od nejvíc v plusu po nejvíc v mínusu.
 */
export const balances = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireMembership(ctx, groupId);
    const balances = balancesOf(await openItems(ctx, groupId));
    const members = await memberLookup(ctx, groupId);

    return [...members]
      .map(([userId, m]) => ({
        userId: userId as Id<"users">,
        nickname: m.nickname,
        color: m.color,
        balance: balances.get(userId) ?? 0,
      }))
      .sort((a, b) => b.balance - a.balance || a.nickname.localeCompare(b.nickname, "cs"));
  },
});

/**
 * Zaznamená zaplacený převod ze zjednodušených dluhů. Převod musí přesně
 * odpovídat tomu, co teď ukazuje `debts` — když mezitím někdo přidal výdaj
 * nebo stejný převod zaplatil (dvojklik, dva telefony), selže s
 * DEBT_CHANGED místo toho, aby se peníze započítaly dvakrát.
 *
 * Když po převodu nikdo nikomu nic nedluží, parta se uzavře: všechny
 * nevyrovnané podíly dostanou `settlementId` tohohle převodu (tím se jejich
 * výdaje zamknou proti úpravám, viz convex/expenses.ts) a všechny otevřené
 * převody `closedBy`. `unsettleSettlement` to umí celé vrátit.
 *
 * Oprávnění: jedna ze stran převodu, nebo kdokoli, když je jednou ze stran host.
 */
export const settleTransfer = mutation({
  args: { groupId: v.id("groups"), from: v.id("users"), to: v.id("users"), amount: v.number() },
  handler: async (ctx, { groupId, from, to, amount }) => {
    const { userId: callerId } = await requireMembership(ctx, groupId);
    if (!(await canActOn(ctx, callerId, groupId, from, to))) {
      throw new ConvexError({ code: ERROR.DEBT_NOT_YOURS });
    }

    const items = await openItems(ctx, groupId);
    const current = simplifyDebts(balancesOf(items));
    if (!current.some((d) => d.from === from && d.to === to && d.amount === amount)) {
      throw new ConvexError({ code: ERROR.DEBT_CHANGED });
    }

    const now = Date.now();
    const settlementId = await ctx.db.insert("settlements", {
      groupId,
      fromUserId: from,
      toUserId: to,
      amount,
      createdBy: callerId,
      createdAt: now,
      kind: "transfer",
    });

    // tenhle převod byl poslední → všichni jsou na nule
    if (current.length === 1) {
      await Promise.all([
        ...items.splits.map((s) => ctx.db.patch(s._id, { settled: true, settledAt: now, settlementId })),
        ...items.transfers.map((s) => ctx.db.patch(s._id, { closedBy: settlementId })),
        ctx.db.patch(settlementId, { closedBy: settlementId }),
      ]);
    }

    return settlementId;
  },
});

/**
 * Zruší vyrovnání: zaplacený převod (`kind: "transfer"`) i staré vyrovnání
 * dvojice. Podíly, které nesou jeho `settlementId`, se vrátí mezi
 * nevyrovnané; když šlo o převod, který partu uzavřel, znovu se otevřou i
 * ostatní převody s `closedBy` na něj. Převod uzavřený JINÝM převodem zrušit
 * nejde (SETTLEMENT_CLOSED) — bilance by se rozjely s tím, co je vyrovnané.
 *
 * Oprávnění: jedna ze dvou stran (nebo kdokoli, je-li stranou host).
 */
export const unsettleSettlement = mutation({
  args: { settlementId: v.id("settlements") },
  handler: async (ctx, { settlementId }) => {
    const settlement = await ctx.db.get(settlementId);
    if (settlement === null) throw new ConvexError({ code: ERROR.SETTLEMENT_NOT_FOUND });

    const { userId } = await requireMembership(ctx, settlement.groupId);
    if (!(await canActOn(ctx, userId, settlement.groupId, settlement.fromUserId, settlement.toUserId))) {
      throw new ConvexError({ code: ERROR.DEBT_NOT_YOURS });
    }
    if (settlement.closedBy !== undefined && settlement.closedBy !== settlementId) {
      throw new ConvexError({ code: ERROR.SETTLEMENT_CLOSED });
    }

    const covered = await ctx.db
      .query("splits")
      .withIndex("by_settlementId", (q) => q.eq("settlementId", settlementId))
      .collect();
    const closed = (
      await ctx.db
        .query("settlements")
        .withIndex("by_group", (q) => q.eq("groupId", settlement.groupId))
        .collect()
    ).filter((s) => s.closedBy === settlementId && s._id !== settlementId);

    await Promise.all([
      ...covered.map((s) => ctx.db.patch(s._id, { settled: false, settledAt: undefined, settlementId: undefined })),
      ...closed.map((s) => ctx.db.patch(s._id, { closedBy: undefined })),
    ]);
    await ctx.db.delete(settlementId);

    return null;
  },
});

/**
 * Historie vyrovnání party, od nejnovějšího, s přezdívkami obou stran — do
 * feedu výdajů jako záznamy „zaplaceno". `period` filtruje podle toho, kdy
 * se platba zaevidovala (stejné rozsahy jako výdaje); bez něj celá historie.
 */
export const listForGroup = query({
  args: {
    groupId: v.id("groups"),
    period: v.optional(v.union(v.literal("thisMonth"), v.literal("lastMonth"), v.literal("all"))),
  },
  handler: async (ctx, { groupId, period }) => {
    await requireMembership(ctx, groupId);
    const { from, to } = periodRange(period ?? "all", Date.now());
    const rows = (
      await ctx.db
        .query("settlements")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .order("desc")
        .collect()
    ).filter((s) => s.createdAt >= from && s.createdAt <= to);

    const members = await memberLookup(ctx, groupId);
    return rows.map((s: Doc<"settlements">) => ({
      ...s,
      fromNickname: members.get(s.fromUserId)?.nickname ?? "Někdo",
      toNickname: members.get(s.toUserId)?.nickname ?? "Někdo",
    }));
  },
});
