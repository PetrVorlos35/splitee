import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Sdílené „kdo je v týhle partě a jakou má barvu/přezdívku". Dřív žilo
 * duplicitně v convex/groups.ts (`membersOf`) a convex/settlements.ts
 * (`memberLookup`) — stejný index, stejný per-člen `ctx.db.get`, stejný
 * fallback na "Někdo". Teď je to jeden zdroj, jak pro `groups.get` (potřebuje
 * celý seřazený seznam), tak pro `settlements.ts` (potřebuje jen rychlé
 * vyhledání podle userId).
 *
 * Žije přímo v convex/, ne v convex/lib/ — čte z `ctx.db`, je to dotaz, ne
 * čistý výpočet (stejný precedens jako convex/guards.ts).
 */
export async function membersOf(ctx: QueryCtx, groupId: Id<"groups">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  const members = await Promise.all(
    memberships.map(async (m) => {
      const user = await ctx.db.get(m.userId);
      return {
        userId: m.userId,
        // create/joinByCode vyžadují requireProfile, takže každé nové
        // členství má přezdívku zaručeně. Fallback je levná pojistka pro
        // data odjinud (např. člen založený přímo v Convex dashboardu).
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

/** Mapa userId → { nickname, color } pro rychlé popisky (dluhy, historie vyrovnání), bez role/joinedAt. */
export async function memberLookup(ctx: QueryCtx, groupId: Id<"groups">) {
  const members = await membersOf(ctx, groupId);
  return new Map(
    members.map((m) => [m.userId as string, { nickname: m.nickname, color: m.color }] as const),
  );
}
