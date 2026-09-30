import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireMembership, requireProfile, requireUser } from "./guards";
import { MAX_MEMBERS } from "./groups";
import { cleanNickname } from "./users";
import { firstFreeColor } from "../lib/colors";
import { ERROR } from "../lib/errors";

/**
 * Hosté = členové party bez účtu. Technicky je to dokument v `users` s
 * `guestGroupId` a běžné členství, takže výdaje, podíly i vyrovnání na ně
 * odkazují úplně stejně jako na přihlášené lidi. Kdo se pak do party připojí,
 * může si hosta převzít (`claim`) — všechny odkazy se přepíšou na jeho účet.
 */

async function requireGuest(ctx: MutationCtx, guestId: Id<"users">, groupId: Id<"groups">) {
  const guest = await ctx.db.get(guestId);
  if (guest === null || guest.guestGroupId !== groupId) {
    throw new ConvexError({ code: ERROR.GUEST_NOT_FOUND });
  }
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", guestId))
    .first();
  if (membership === null) throw new ConvexError({ code: ERROR.GUEST_NOT_FOUND });
  return { guest, membership };
}

/** Přidá hosta do party. Kdokoli z party; limit členů platí i pro hosty. */
export const add = mutation({
  args: { groupId: v.id("groups"), nickname: v.string() },
  handler: async (ctx, { groupId, nickname }) => {
    await requireMembership(ctx, groupId);
    const clean = cleanNickname(nickname);

    // plný collect ze stejného důvodu jako v groups.joinByCode (OCC + barvy)
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    if (memberships.length >= MAX_MEMBERS) throw new ConvexError({ code: ERROR.GROUP_FULL });

    const guestId = await ctx.db.insert("users", { nickname: clean, guestGroupId: groupId });
    await ctx.db.insert("memberships", {
      groupId,
      userId: guestId,
      color: firstFreeColor(memberships.map((m) => m.color)),
      role: "member",
      joinedAt: Date.now(),
    });
    return guestId;
  },
});

export const rename = mutation({
  args: { groupId: v.id("groups"), guestId: v.id("users"), nickname: v.string() },
  handler: async (ctx, { groupId, guestId, nickname }) => {
    await requireMembership(ctx, groupId);
    await requireGuest(ctx, guestId, groupId);
    await ctx.db.patch(guestId, { nickname: cleanNickname(nickname) });
    return null;
  },
});

/** Smaže hosta, ale jen dokud na něj nic neodkazuje — jinak by zmizely peníze. */
export const remove = mutation({
  args: { groupId: v.id("groups"), guestId: v.id("users") },
  handler: async (ctx, { groupId, guestId }) => {
    await requireMembership(ctx, groupId);
    const { membership } = await requireGuest(ctx, guestId, groupId);

    const paid = await ctx.db
      .query("expenses")
      .withIndex("by_group_payer", (q) => q.eq("groupId", groupId).eq("payerId", guestId))
      .first();
    const share = await ctx.db
      .query("splits")
      .withIndex("by_group_user_settled", (q) => q.eq("groupId", groupId).eq("userId", guestId))
      .first();
    if (paid !== null || share !== null) throw new ConvexError({ code: ERROR.GUEST_HAS_ACTIVITY });

    await ctx.db.delete(membership._id);
    await ctx.db.delete(guestId);
    return null;
  },
});

/**
 * Hosté party podle kódu pozvánky — pro výběr „kdo z nich jsi" při vstupu.
 * Vyžaduje přihlášení (na rozdíl od previewByCode), protože prozrazuje jména.
 */
export const listByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
      .first();
    if (group === null) return { groupId: null, alreadyMember: false, guests: [] };

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    const alreadyMember = memberships.some((m) => m.userId === userId);
    const rows = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        if (user === null || user.guestGroupId !== group._id) return null;
        return { userId: m.userId, nickname: user.nickname ?? "Host", color: m.color, joinedAt: m.joinedAt };
      }),
    );
    const guests = rows
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    return { groupId: group._id, alreadyMember, guests };
  },
});

/**
 * Vstup do party jako existující host: přihlášený uživatel převezme hosta i
 * s historií. Členství hosta (barva, joinedAt, role) zůstane, jen se přepíše
 * userId; stejně tak každý výdaj, podíl a vyrovnání v partě. Host pak zanikne.
 *
 * Uživatel, který už v partě je, převzít hosta nesmí — sloučit dvě identity
 * by u výdajů, kde jsou oba, vyrobilo dva podíly jednoho člověka.
 */
export const claim = mutation({
  args: { code: v.string(), guestId: v.id("users") },
  handler: async (ctx, { code, guestId }) => {
    const { _id: userId } = await requireProfile(ctx);
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
      .first();
    if (group === null) throw new ConvexError({ code: ERROR.INVITE_CODE_INVALID });
    const groupId = group._id;

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
      .first();
    if (existing !== null) throw new ConvexError({ code: ERROR.ALREADY_MEMBER });

    const { membership } = await requireGuest(ctx, guestId, groupId);
    const swap = <T extends Id<"users"> | undefined>(id: T) => (id === guestId ? userId : id);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_spentAt", (q) => q.eq("groupId", groupId))
      .collect();
    for (const e of expenses) {
      if (e.payerId === guestId || e.createdBy === guestId || e.updatedBy === guestId) {
        await ctx.db.patch(e._id, {
          payerId: swap(e.payerId),
          createdBy: swap(e.createdBy),
          updatedBy: swap(e.updatedBy),
        });
      }
    }

    const splits = await ctx.db
      .query("splits")
      .withIndex("by_group_spentAt", (q) => q.eq("groupId", groupId))
      .collect();
    for (const s of splits) {
      if (s.userId === guestId || s.payerId === guestId) {
        await ctx.db.patch(s._id, { userId: swap(s.userId), payerId: swap(s.payerId) });
      }
    }

    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const s of settlements) {
      if (s.fromUserId === guestId || s.toUserId === guestId || s.createdBy === guestId) {
        await ctx.db.patch(s._id, {
          fromUserId: swap(s.fromUserId),
          toUserId: swap(s.toUserId),
          createdBy: swap(s.createdBy),
        });
      }
    }

    await ctx.db.patch(membership._id, { userId });
    await ctx.db.delete(guestId);
    await ctx.db.patch(userId, { lastGroupId: groupId });
    return groupId;
  },
});
