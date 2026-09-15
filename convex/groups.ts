import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, requireMembership } from "./guards";
import { seedCategories } from "./categories";
import { generateInviteCode } from "./lib/inviteCode";
import { firstFreeColor } from "../lib/colors";

export const MAX_MEMBERS = 10;

async function uniqueInviteCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const taken = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (taken === null) return code;
  }
  throw new Error("Nepodařilo se vygenerovat kód party, zkus to znovu.");
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

export const create = mutation({
  args: { name: v.string(), emoji: v.string(), currency: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new Error("Parta potřebuje název.");

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

export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const normalized = code.trim().toUpperCase();

    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalized))
      .first();
    if (group === null) throw new Error("Takový kód nikam nevede.");

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
      throw new Error("Parta je plná, víc než deset lidí to neutáhne.");
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

export const get = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireMembership(ctx, groupId);
    const group = await ctx.db.get(groupId);
    if (group === null) throw new Error("Parta neexistuje.");
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
