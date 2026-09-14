/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../schema";

type TestConvex = ReturnType<typeof convexTest>;

/**
 * Založí uživatele i session a vrátí klienta, který se tváří jako přihlášený.
 * `subject` musí mít tvar "<userId>|<sessionId>" — přesně to getAuthUserId parsuje.
 */
export async function signedInAs(
  t: TestConvex,
  user: { name?: string; email?: string; nickname?: string } = {},
) {
  const { userId, sessionId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", user);
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expirationTime: Date.now() + 1000 * 60 * 60,
    });
    return { userId, sessionId };
  });

  return { userId, sessionId, asUser: t.withIdentity({ subject: `${userId}|${sessionId}` }) };
}

export function newTest() {
  // Explicitní modules: node_modules je v tomhle worktree symlink, takže
  // convex-test výchozí `import.meta.glob("../../../convex/**/*.*s")`
  // (volané zevnitř node_modules/convex-test) by po vyřešení symlinku
  // našlo convex/ v hlavním checkoutu, ne v tomhle worktree.
  return convexTest(schema, import.meta.glob("../**/*.*s"));
}
