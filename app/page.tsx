"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { t } from "@/lib/i18n";

function Viewer() {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  return (
    <div className="p-8">
      <p className="text-lg">{t("auth.signedInAs", { name: viewer?.name ?? "…" })}</p>
      <button onClick={() => void signOut()} className="mt-4 underline">
        {t("auth.signOut")}
      </button>
    </div>
  );
}

export default function Home() {
  const { signIn } = useAuthActions();
  return (
    <main className="min-h-dvh">
      <AuthLoading>
        <p className="p-8">{t("auth.loading")}</p>
      </AuthLoading>
      <Unauthenticated>
        <div className="p-8">
          <h1 className="text-3xl font-semibold">{t("app.name")}</h1>
          <p className="mt-2 text-neutral-600">{t("app.tagline")}</p>
          <button
            onClick={() => void signIn("google")}
            className="mt-6 rounded-full bg-black px-6 py-3 text-white"
          >
            {t("auth.signIn")}
          </button>
        </div>
      </Unauthenticated>
      <Authenticated>
        <Viewer />
      </Authenticated>
    </main>
  );
}
