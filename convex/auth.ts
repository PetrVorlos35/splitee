import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { MEMBER_COLORS } from "../lib/colors";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    // běží při každém přihlášení; existingUserId === null znamená první registraci
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId === null) {
        await ctx.db.patch(userId, { accentColor: MEMBER_COLORS[8].hex });
      }
    },
  },
});
