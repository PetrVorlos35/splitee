import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(undefined, {
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 }, // 30 dní, jinak se odhlásí při zavření appky
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
