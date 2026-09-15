import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, requireProfile, requireMembership } from "./guards";
import { seedCategories } from "./categories";
import { generateInviteCode } from "./lib/inviteCode";
import { firstFreeColor } from "../lib/colors";
import { ERROR } from "../lib/errors";

export const MAX_MEMBERS = 10;

/**
 * `rng` je jen pro testy — přeposílá se do `generateInviteCode(rng)`, které
 * bez argumentu samo sáhne po bezpečném CSPRNG. Exportovaná, aby
 * convex/tests/groups.test.ts mohla přes `t.run` ověřit kolizní větev bez
 * čekání na skutečnou kolizi v ~887M kombinacích.
 */
export async function uniqueInviteCode(ctx: MutationCtx, rng?: () => number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode(rng);
    const taken = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (taken === null) return code;
  }
  throw new ConvexError({ code: ERROR.INVITE_CODE_EXHAUSTED });
}

async function membersOf(ctx: QueryCtx, groupId: Id<"groups">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  const members = await Promise.all(
    memberships.map(async (m) => {
      const user = await ctx.db.get(m.userId);
      return {
        userId: m.userId,
        // create/joinByCode teď vyžadují requireProfile, takže každé nové
        // členství má přezdívku zaručeně. Fallback zůstává jako levná
        // pojistka pro data odjinud (např. člen založený přímo v Convex
        // dashboardu), ne proto, že by ho běžná cesta appkou ještě mohla
        // zasáhnout.
        nickname: user?.nickname ?? user?.name ?? "Někdo",
        image: user?.image,
        color: m.color,
        role: m.role,
        joinedAt: m.joinedAt,
      };
    }),
  );

  return members.sort((a, b) => a.joinedAt - b.joinedAt);
}

/** Založí partu, zakladatele udělá ownerem s první barvou, nasype sedm výchozích kategorií. Vrací Id<"groups">. */
export const create = mutation({
  args: { name: v.string(), emoji: v.string(), currency: v.string() },
  handler: async (ctx, args) => {
    // requireProfile, ne requireUser — zakladatel bez dokončeného onboardingu
    // (bez přezdívky) by byl pro zbytek party k ničemu.
    const { _id: userId } = await requireProfile(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError({ code: ERROR.GROUP_NAME_EMPTY });

    const now = Date.now();
    const groupId = await ctx.db.insert("groups", {
      name,
      emoji: args.emoji,
      currency: args.currency,
      inviteCode: await uniqueInviteCode(ctx),
      ownerId: userId,
      createdAt: now,
    });

    await ctx.db.insert("memberships", {
      groupId,
      userId,
      color: firstFreeColor([]),
      role: "owner",
      joinedAt: now,
    });

    await seedCategories(ctx, groupId);
    await ctx.db.patch(userId, { lastGroupId: groupId });

    return groupId;
  },
});

/**
 * Vstup do party podle kódu (nezávisle na velikosti písmen a mezerách).
 * Idempotentní — druhé volání téhož uživatele jen aktualizuje lastGroupId a
 * nezakládá druhé členství. Vrací Id<"groups">, na který se dá rovnou
 * router.push(`/g/${groupId}`).
 */
export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    // requireProfile — stejný důvod jako u create.
    const { _id: userId } = await requireProfile(ctx);
    const normalized = code.trim().toUpperCase();

    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalized))
      .first();
    if (group === null) throw new ConvexError({ code: ERROR.INVITE_CODE_INVALID });

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", group._id).eq("userId", userId))
      .first();
    if (existing !== null) {
      // opakované kliknutí na odkaz nesmí založit druhé členství
      await ctx.db.patch(userId, { lastGroupId: group._id });
      return group._id;
    }

    // Limit se vynucuje tady, ne v UI. Convex spouští mutace transakčně s
    // optimistickou konkurencí (OCC) — čtení celého indexu by_group pro tuhle
    // partu zakládá "read set" a insert do stejné party ho poruší. Když dva
    // lidi zavolají joinByCode na devítičlennou partu současně, Convex jednu
    // z mutací automaticky serializuje/zopakuje až po té druhé, takže druhé
    // volání uvidí už deset členů a spadne na limitu — nikdy jich nevznikne
    // jedenáct.
    //
    // Ten `.collect()` NENÍ jen zjednodušující líné čtení celé kolekce — je
    // nosný pro tuhle záruku. Kdyby ho nahradil `.count()` nebo
    // `.take(MAX_MEMBERS)`, zúžil by se konfliktní interval OCC jen na
    // "prvních N řádků" nebo jen na agregát, a dva souběžné joiny by mohly
    // číst disjunktní/agregované rozsahy, které se navzájem nekonfliktují —
    // oba by pak viděly "9" a oba by vložili, čímž by vzniklo jedenáct členů.
    // Plný `.collect()` navíc reálně potřebujeme i pro `firstFreeColor`
    // (musí znát všechny obsazené barvy, ne jen počet), takže tahle
    // "plýtvavost" je zadarmo — nekupujeme si ji navíc kvůli race safety.
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    if (memberships.length >= MAX_MEMBERS) {
      throw new ConvexError({ code: ERROR.GROUP_FULL });
    }

    await ctx.db.insert("memberships", {
      groupId: group._id,
      userId,
      color: firstFreeColor(memberships.map((m) => m.color)),
      role: "member",
      joinedAt: Date.now(),
    });
    await ctx.db.patch(userId, { lastGroupId: group._id });

    return group._id;
  },
});

/** Party přihlášeného uživatele — `{ _id, name, emoji, currency, inviteCode, memberCount }[]`, bez archivovaných. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const group = await ctx.db.get(m.groupId);
        if (group === null || group.archivedAt !== undefined) return null;
        const memberCount = (
          await ctx.db
            .query("memberships")
            .withIndex("by_group", (q) => q.eq("groupId", group._id))
            .collect()
        ).length;
        return {
          _id: group._id,
          name: group.name,
          emoji: group.emoji,
          currency: group.currency,
          inviteCode: group.inviteCode,
          memberCount,
        };
      }),
    );

    // type predicate, jinak TypeScript v poli nechá `| null`
    return groups.filter((g): g is NonNullable<typeof g> => g !== null);
  },
});

/**
 * Detail party pro člena — spadne, pokud volající není členem (requireMembership).
 * Vrací celý dokument `groups` + `members: { userId, nickname, image?, color, role, joinedAt }[]`
 * seřazené podle joinedAt (nejstarší = zakladatel první).
 */
export const get = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireMembership(ctx, groupId);
    const group = await ctx.db.get(groupId);
    if (group === null) throw new ConvexError({ code: ERROR.GROUP_NOT_FOUND });
    return { ...group, members: await membersOf(ctx, groupId) };
  },
});

/** Náhled pro /join/[code] — schválně nevyžaduje přihlášení a neprozrazuje členy. */
export const previewByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
      .first();
    if (group === null) return null;

    const memberCount = (
      await ctx.db
        .query("memberships")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect()
    ).length;

    return { name: group.name, emoji: group.emoji, memberCount };
  },
});
