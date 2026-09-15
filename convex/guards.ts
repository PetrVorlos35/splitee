import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** Každá mutace začíná tímhle — bez přihlášení se nesmí zapisovat nic. */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Nejsi přihlášený.");
  return userId;
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
  if (membership === null) throw new Error("Do téhle party nemáš přístup.");
  return { userId, membership };
}
