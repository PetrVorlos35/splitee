import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// veřejné jsou jen úvodní obrazovka (přihlášení), vstup do party přes kód a
// OG obrázek (nemá v cestě tečku, takže ho matcher níž nepropustí sám —
// bez tohohle by crawler náhledů dostal redirect místo obrázku)
const isPublic = createRouteMatcher(["/", "/join/(.*)", "/opengraph-image(.*)"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (!isPublic(request) && !(await convexAuth.isAuthenticated())) {
      // vždy jen "/" bez query — cokoli s ?code= by mezitím zkusila middleware
      // vyměnit za token a při neúspěchu by to smazalo přihlašovací cookie
      return nextjsMiddlewareRedirect(request, "/");
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } }, // 30 dní, jinak se odhlásí při zavření appky
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
