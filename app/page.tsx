"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { t } from "@/lib/i18n";

function Viewer() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();

  // middleware hlídá jen přihlášení — dokončený onboarding se pozná až tady,
  // z Convex dotazu, a bez přezdívky appku pustit dál nedáme
  useEffect(() => {
    if (viewer && !viewer.nickname) router.replace("/onboarding");
  }, [viewer, router]);

  if (viewer === undefined || (viewer && !viewer.nickname)) {
    return <p className="p-8">{t("auth.loading")}</p>;
  }

  return (
    <div className="p-8">
      <p className="text-lg">{t("auth.signedInAs", { name: viewer?.name ?? "…" })}</p>
      <div className="mt-4 flex gap-4">
        <Link href="/me" className="underline">
          {t("nav.profile")}
        </Link>
        <button onClick={() => void signOut()} className="underline">
          {t("auth.signOut")}
        </button>
      </div>
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
