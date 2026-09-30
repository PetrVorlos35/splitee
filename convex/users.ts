import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProfile, requireUser } from "./guards";
import { MEMBER_COLORS } from "../lib/colors";
import { ERROR } from "../lib/errors";

export const NICKNAME_MAX = 24;

export function cleanNickname(raw: string) {
  const nickname = raw.trim();
  if (nickname.length === 0) throw new ConvexError({ code: ERROR.NICKNAME_EMPTY });
  if (nickname.length > NICKNAME_MAX) {
    throw new ConvexError({ code: ERROR.NICKNAME_TOO_LONG, max: NICKNAME_MAX });
  }
  return nickname;
}

/** accentColor je vždy klíč z MEMBER_COLORS (např. "blue"), nikdy hex. */
function checkAccent(key: string) {
  if (!MEMBER_COLORS.some((c) => c.key === key)) {
    throw new ConvexError({ code: ERROR.UNKNOWN_ACCENT });
  }
  return key;
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId === null ? null : await ctx.db.get(userId);
  },
});

export const completeOnboarding = mutation({
  args: { nickname: v.string(), accentColor: v.string() },
  handler: async (ctx, args) => {
    // requireUser (ne requireProfile) — kdo tohle volá právě nemá nickname,
    // to je celý smysl onboardingu
    const userId = await requireUser(ctx);
    await ctx.db.patch(userId, {
      nickname: cleanNickname(args.nickname),
      accentColor: checkAccent(args.accentColor),
    });
    return null;
  },
});

export const updateProfile = mutation({
  args: { nickname: v.optional(v.string()), accentColor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // requireProfile — tahle mutace upravuje existující profil, ne ho zakládá
    const { _id: userId } = await requireProfile(ctx);
    const patch: { nickname?: string; accentColor?: string } = {};
    if (args.nickname !== undefined) patch.nickname = cleanNickname(args.nickname);
    if (args.accentColor !== undefined) patch.accentColor = checkAccent(args.accentColor);
    await ctx.db.patch(userId, patch);

    // Barva je identita v partě — kde ji nikdo jiný nemá, přebarvi i členství.
    // Kde je obsazená, zůstane dosavadní (barvy se v partě nesmí opakovat).
    if (patch.accentColor !== undefined) {
      const mine = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const m of mine) {
        const others = await ctx.db
          .query("memberships")
          .withIndex("by_group", (q) => q.eq("groupId", m.groupId))
          .collect();
        const taken = others.some((o) => o.userId !== userId && o.color === patch.accentColor);
        if (!taken && m.color !== patch.accentColor) await ctx.db.patch(m._id, { color: patch.accentColor });
      }
    }
    return null;
  },
});
