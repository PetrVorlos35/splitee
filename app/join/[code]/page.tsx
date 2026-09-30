"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { Check, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorLine } from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import { people, t } from "@/lib/i18n";

// sessionStorage klíč, kterým si tahle stránka předá rozdělaný vstup do
// party dál na "/" (přes onboarding) — NIKDY query parametr `?code=`, viz
// middleware.ts. Jediné místo, které klíč čte a maže, je app/page.tsx.
const PENDING_INVITE_KEY = "splitee.pendingInviteCode";

const NEW = "new";

function Spinner() {
  return <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-rule border-t-form" />;
}

/**
 * Přihlášený uživatel: když v partě čekají hosté, vybere si, jestli je jedním
 * z nich (převezme ho i s historií), nebo jde dovnitř jako nový člen. Bez
 * hostů se připojí rovnou.
 */
function JoinAsSignedIn({ code }: { code: string }) {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const info = useQuery(api.guests.listByCode, viewer?.nickname ? { code } : "skip");
  const join = useMutation(api.groups.joinByCode);
  const claim = useMutation(api.guests.claim);
  const [choice, setChoice] = useState<string>(NEW);
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!viewer) return;
    if (!viewer.nickname) {
      // dokonči onboarding — ten se vrátí na "/", a "/" odsud pošle zpátky sem
      sessionStorage.setItem(PENDING_INVITE_KEY, code);
      router.replace("/onboarding");
      return;
    }
    if (info === undefined || attempted.current) return;

    if (info.alreadyMember && info.groupId) {
      attempted.current = true;
      router.replace(`/g/${info.groupId}`);
      return;
    }
    if (info.guests.length === 0) {
      attempted.current = true;
      join({ code })
        .then((groupId) => router.replace(`/g/${groupId}`))
        .catch((e) => setError(errorMessage(e)));
    }
  }, [viewer, info, code, join, router]);

  async function confirm() {
    setError(undefined);
    setWorking(true);
    try {
      const groupId =
        choice === NEW ? await join({ code }) : await claim({ code, guestId: choice as Id<"users"> });
      router.replace(`/g/${groupId}`);
    } catch (e) {
      setError(errorMessage(e));
      setWorking(false);
    }
  }

  if (error && (info === undefined || info.guests.length === 0)) return <ErrorLine>{error}</ErrorLine>;
  if (info === undefined || info.guests.length === 0 || info.alreadyMember) {
    return (
      <div className="flex items-center gap-3 text-ink-2">
        <Spinner />
        {t("join.joining")}
      </div>
    );
  }

  const chosen = info.guests.find((g) => g.userId === choice);
  const options = [
    ...info.guests.map((g) => ({ id: g.userId as string, label: g.nickname, guest: g })),
    { id: NEW, label: t("join.who.none"), guest: null },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">{t("join.who.title")}</h2>
        <p className="text-sm leading-relaxed text-ink-2">{t("join.who.hint")}</p>
      </div>
      <ul role="radiogroup" aria-label={t("join.who.title")} className="overflow-hidden rounded-slip bg-sheet shadow-slip">
        {options.map((o) => {
          const active = choice === o.id;
          return (
            <li key={o.id} className="border-b border-rule-soft last:border-b-0">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setChoice(o.id)}
                className={`flex min-h-15 w-full items-center gap-3 px-4 py-2.5 text-left ${active ? "bg-form-soft/60" : "active:bg-paper"}`}
              >
                {o.guest ? (
                  <Avatar nickname={o.guest.nickname} colorKey={o.guest.color} isGuest size={34} />
                ) : (
                  <span className="flex size-[34px] items-center justify-center rounded-[6px] border border-rule text-ink-3"><UserPlus size={17} /></span>
                )}
                <span className={`flex-1 font-medium ${o.guest ? "" : "text-ink-2"}`}>{o.label}</span>
                <span
                  aria-hidden
                  className={`flex size-[22px] items-center justify-center rounded-full border-[1.5px] ${
                    active ? "border-form bg-form text-white" : "border-rule"
                  }`}
                >
                  {active && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <ErrorLine>{error}</ErrorLine>
      <Button type="button" className="w-full" disabled={working} onClick={() => void confirm()}>
        {working ? t("join.joining") : chosen ? t("join.who.confirm", { name: chosen.nickname }) : t("group.join.submit")}
      </Button>
    </div>
  );
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { signIn } = useAuthActions();
  const preview = useQuery(api.groups.previewByCode, { code });

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        {preview === undefined ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : preview === null ? (
          <p className="text-lg font-medium text-balance">{t("join.notFound")}</p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-[4px] border border-rule bg-sheet text-4xl shadow-slip">
                {preview.emoji}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">{preview.name}</h1>
                <p className="text-sm text-ink-3">{t("join.memberCount", { people: people(preview.memberCount) })}</p>
              </div>
            </div>

            <AuthLoading>
              <Spinner />
            </AuthLoading>
            <Unauthenticated>
              <Button
                type="button"
                className="w-full"
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
      </div>
    </main>
  );
}
