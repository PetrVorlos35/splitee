"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

// sessionStorage klíč, kterým si tahle stránka předá rozdělaný vstup do
// party dál na "/" (přes onboarding, který si tam jen zajde a beze čtení
// klíče se zase vrátí domů) — NIKDY query parametr `?code=`, viz
// middleware.ts a InviteSheet. Jediné místo, které klíč čte a maže, je
// app/page.tsx; stejný literál je i tam, ať se tenhle modul (a s ním celá
// stránka /join) netahá do bundlu "/" jen kvůli jednomu stringu.
const PENDING_INVITE_KEY = "splitee.pendingInviteCode";

function JoinAsSignedIn({ code }: { code: string }) {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const join = useMutation(api.groups.joinByCode);
  const [error, setError] = useState<string>();
  const attempted = useRef(false);

  useEffect(() => {
    // undefined = ještě se načítá; null nastane jen na okamžik, než se
    // Authenticated wrapper srovná s auth stavem klienta
    if (!viewer) return;

    if (!viewer.nickname) {
      // dokonči onboarding — ten se po uložení přezdívky vždy vrátí na "/",
      // a "/" (jediný spotřebitel klíče) odsud pošle dál do /join/<kód>
      sessionStorage.setItem(PENDING_INVITE_KEY, code);
      router.replace("/onboarding");
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    join({ code })
      .then((groupId) => router.replace(`/g/${groupId}`))
      .catch((e) => setError(errorMessage(e)));
  }, [viewer, code, join, router]);

  if (error) return <p className="text-red-600">{error}</p>;
  return <p>{t("join.joining")}</p>;
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { signIn } = useAuthActions();
  const preview = useQuery(api.groups.previewByCode, { code });

  if (preview === undefined) return <p className="p-6">{t("auth.loading")}</p>;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("join.title")}</h1>

      {preview === null ? (
        <p className="text-neutral-600">{t("join.notFound")}</p>
      ) : (
        <>
          <p className="text-5xl">{preview.emoji}</p>
          <p className="text-xl font-medium">{preview.name}</p>
          <p className="text-sm text-neutral-500">
            {t("join.memberCount", { count: preview.memberCount })}
          </p>

          <AuthLoading>
            <p>{t("auth.loading")}</p>
          </AuthLoading>
          <Unauthenticated>
            <Button
              type="button"
              onClick={() => {
                sessionStorage.setItem(PENDING_INVITE_KEY, code);
                void signIn("google");
              }}
            >
              {t("auth.signIn")}
            </Button>
          </Unauthenticated>
          <Authenticated>
            <JoinAsSignedIn code={code} />
          </Authenticated>
        </>
      )}
    </main>
  );
}
