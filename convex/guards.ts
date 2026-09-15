import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ERROR } from "../lib/errors";

/** Každá mutace začíná tímhle — bez přihlášení se nesmí zapisovat nic. */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError({ code: ERROR.NOT_SIGNED_IN });
  return userId;
}

/**
 * Jako `requireUser`, ale navíc vyžaduje dokončený onboarding a vrátí celý
 * dokument uživatele. `app/page.tsx` hlídá onboarding jen na klientu —
 * tohle je server-side verze téhož zámku pro mutace, kde nestačí spoléhat
 * na to, že se uživatel přes onboarding UI vůbec probral.
 */
export async function requireProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUser(ctx);
  const user = await ctx.db.get(userId);
  if (user === null || !user.nickname) {
    throw new ConvexError({ code: ERROR.NOT_ONBOARDED });
  }
  return user;
}

/**
 * Vrátí členství, nebo spadne. Používá ji každý dotaz i mutace nad partou —
 * oprávnění se nikdy nekontroluje v UI.
 */
export async function requireMembership(ctx: QueryCtx | MutationCtx, groupId: Id<"groups">) {
  const userId = await requireUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .first();
  if (membership === null) throw new ConvexError({ code: ERROR.NOT_MEMBER });
  return { userId, membership };
}
