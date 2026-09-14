/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../convex/schema";

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
  // Explicitní modules: convex-test defaultně volá import.meta.glob zevnitř
  // node_modules/convex-test, takže kořen convex/ modulů odvozuje z toho, kde
  // leží convex-test balíček, ne z tohohle repa — v symlinkovaném node_modules
  // (např. git worktree) by to sáhlo úplně jinam. Glob proto voláme tady, v
  // souboru s pevnou relativní pozicí vůči convex/, aby výsledek nezávisel na
  // tom, odkud se convex-test zrovna resolvuje.
  return convexTest(schema, import.meta.glob("../convex/**/*.*s"));
}
