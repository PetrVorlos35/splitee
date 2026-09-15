import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// veřejné jsou jen úvodní obrazovka (přihlášení) a vstup do party přes kód
const isPublic = createRouteMatcher(["/", "/join/(.*)"]);

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
