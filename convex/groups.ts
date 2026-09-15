import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, requireMembership } from "./guards";
import { seedCategories } from "./categories";
import { generateInviteCode } from "./lib/inviteCode";
import { firstFreeColor } from "../lib/colors";

export const MAX_MEMBERS = 10;

/**
 * Kódy chyb party — stabilní, strojově čitelné, NIKDY česká věta. Convex na
 * produkci redaguje zprávu obyčejného `Error` na generické "Server Error",
 * takže jediná cesta k českému textu na obrazovce je ConvexError.data.code +
 * překlad přes t() až na volajícím místě v komponentě (klíče "error.<code>"
 * v lib/i18n.ts). Task 6 a 7 by měly sáhnout po stejných jménech, ne
 * vymýšlet vlastní: GROUP_NAME_REQUIRED, INVITE_CODE_EXHAUSTED,
 * INVITE_CODE_INVALID, GROUP_FULL, GROUP_NOT_FOUND.
 */
async function uniqueInviteCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const taken = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (taken === null) return code;
  }
  throw new ConvexError({ code: "INVITE_CODE_EXHAUSTED" });
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
    // TODO(guards): až přibude requireProfile (Task 4 review), nahraď —
    // zakladatel bez přezdívky je pro zbytek party k ničemu.
    const userId = await requireUser(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError({ code: "GROUP_NAME_REQUIRED" });

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
    // TODO(guards): stejně jako u create — nahraď requireProfile, jakmile
    // existuje.
    const userId = await requireUser(ctx);
    const normalized = code.trim().toUpperCase();

    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalized))
      .first();
    if (group === null) throw new ConvexError({ code: "INVITE_CODE_INVALID" });

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
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    if (memberships.length >= MAX_MEMBERS) {
      throw new ConvexError({ code: "GROUP_FULL" });
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
    if (group === null) throw new ConvexError({ code: "GROUP_NOT_FOUND" });
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
