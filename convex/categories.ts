import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireMembership } from "./guards";

export const DEFAULT_CATEGORIES = [
  { name: "Jídlo", icon: "🍽️", color: "#F25A5A" },
  { name: "Potraviny", icon: "🛒", color: "#67A529" },
  { name: "Doprava", icon: "🚗", color: "#5099E2" },
  { name: "Bydlení", icon: "🏠", color: "#CE8339" },
  { name: "Zábava", icon: "🎉", color: "#DF62DF" },
  { name: "Nákupy", icon: "🛍️", color: "#A65AF2" },
  { name: "Ostatní", icon: "✨", color: "#8C8C8C" },
] as const;

/** Volá se při vzniku party — kategorie jsou vždy vlastní, žádné globální. */
export async function seedCategories(ctx: MutationCtx, groupId: Id<"groups">) {
  await Promise.all(
    DEFAULT_CATEGORIES.map((category, order) =>
      ctx.db.insert("categories", { groupId, order, ...category }),
    ),
  );
}

export const listForGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireMembership(ctx, groupId);
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    return categories.sort((a, b) => a.order - b.order);
  },
});
