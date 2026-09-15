import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProfile, requireUser } from "./guards";
import { MEMBER_COLORS } from "../lib/colors";
import { ERROR } from "../lib/errors";

export const NICKNAME_MAX = 24;

function cleanNickname(raw: string) {
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
    return null;
  },
});
