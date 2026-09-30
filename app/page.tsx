"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { KeyRound, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { CreateGroupSheet, JoinByCodeSheet } from "@/components/groups/GroupSheets";
import { t } from "@/lib/i18n";

// stejný literál jako v app/join/[code]/page.tsx (tam se nastavuje). "/" je
// JEDINÝ, kdo tenhle klíč čte a maže — onboarding ho záměrně nekonzumuje,
// aby dvě konkurenční router.replace volání ze stejné reaktivní aktualizace
// (dokonči vstup do party vs. "onboarding hotový, jdi domů") nezávodila o
// to, co doběhne poslední. Viz komentář u handledEntry níž.
const PENDING_INVITE_KEY = "splitee.pendingInviteCode";

/** Přihlášený a onboardovaný, ale zatím v žádné partě. */
function NoGroup() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">{t("group.empty.title")}</h1>
        <p className="leading-relaxed text-ink-2">{t("group.empty.hint")}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus size={20} strokeWidth={2.4} />
          {t("group.create")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setJoinOpen(true)}>
          <KeyRound size={18} className="text-form" />
          {t("group.join")}
        </Button>
      </div>

      <CreateGroupSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(groupId) => router.push(`/g/${groupId}`)}
      />
      <JoinByCodeSheet open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

function Viewer() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const groups = useQuery(api.groups.listMine, viewer?.nickname ? {} : "skip");
  const { signOut } = useAuthActions();
  const [redirecting, setRedirecting] = useState(false);
  // StrictMode v dev módu efekt při mountu zavolá dvakrát za sebou. Bez
  // tohohle by první běh přečetl a smazal PENDING_INVITE_KEY a přesměroval
  // na /join/<kód>, ale druhý běh by už klíč nenašel, propadl by se k "mám
  // partu, jdi tam" a druhé router.replace by první přebilo. Appka je teď
  // jediný spotřebitel toho klíče (viz app/onboarding/page.tsx), takže se
  // rozhoduje přesně jednou za mount, ne podle toho, co doběhne poslední.
  const handledEntry = useRef(false);

  // middleware hlídá jen přihlášení — dokončený onboarding se pozná až tady,
  // z Convex dotazu, a bez přezdívky appku pustit dál nedáme
  useEffect(() => {
    if (viewer && !viewer.nickname) router.replace("/onboarding");
  }, [viewer, router]);

  // Jediné místo, které rozhoduje, kam přihlášeného a onboardovaného
  // uživatele poslat dál — schválně JEDEN efekt, ne dva nezávislé, aby si
  // "mám rozdělaný vstup do party" a "mám partu, jdi tam" nezávodily o
  // router.replace ve stejném tiku. Rozdělaný vstup (sessionStorage,
  // nastavuje ho /join/[code] při přihlášení bez dokončeného profilu) má
  // vždy přednost: jinak by vracející se přihlášený uživatel s vlastní
  // partou skončil tiše ve své staré partě a pozvánka by beze stopy
  // zmizela — přesně tenhle bug tu byl. Klíč se maže hned při přečtení, ať
  // nezůstane viset a nenaskočí i při příští, nesouvisející návštěvě.
  useEffect(() => {
    if (!viewer?.nickname || groups === undefined) return;
    if (handledEntry.current) return;
    handledEntry.current = true;

    const pendingCode = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (pendingCode) {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      setRedirecting(true);
      router.replace(`/join/${pendingCode}`);
      return;
    }

    if (groups.length > 0) {
      setRedirecting(true);
      router.replace(`/g/${viewer.lastGroupId ?? groups[0]._id}`);
    }
  }, [viewer, groups, router]);

  if (viewer === undefined || (viewer && !viewer.nickname) || groups === undefined || redirecting) {
    return <Loading />;
  }

  return (
    <Shell>
      <NoGroup />
      <button
        onClick={() => void signOut()}
        className="mt-10 h-11 self-center rounded-[6px] px-4 text-sm font-medium text-ink-2 active:bg-rule-soft"
      >
        {t("auth.signOut")}
      </button>
    </Shell>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.01em]">
      <span aria-hidden className="grid size-7 grid-cols-2 gap-[3px] rounded-[7px] bg-form p-[5px]">
        <span className="rounded-[2px] bg-white" />
        <span className="rounded-[2px] bg-white/45" />
        <span className="rounded-[2px] bg-white/45" />
        <span className="rounded-[2px] bg-white" />
      </span>
      {t("app.name")}
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Wordmark />
      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy>
      <span className="sr-only">{t("auth.loading")}</span>
      <span className="size-6 animate-spin rounded-full border-2 border-rule border-t-form" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 rounded-full bg-white p-[2px]">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

/** Ukázka toho, co appka dělá — ústřižek s dluhem. Ilustrační data, ne skutečná parta. */
function SampleStub() {
  return (
    <div aria-hidden className="relative flex overflow-hidden rounded-slip bg-sheet shadow-slip">
      <div className="flex flex-1 items-center gap-3 py-3.5 pl-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#2BAB2B] text-sm font-semibold">H</span>
        <span className="flex flex-col">
          <span className="text-[0.9375rem] font-medium">Honza ti dluží</span>
          <span className="font-mono text-lg font-medium tabular">412 Kč</span>
        </span>
      </div>
      <div className="relative flex items-center px-4">
        <span className="absolute inset-y-2 left-0 border-l-[1.5px] border-dotted border-rule" />
        <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-paper" />
        <span className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-paper" />
        <span className="text-sm font-semibold text-form">{t("debt.settle")}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { signIn } = useAuthActions();
  return (
    <main>
      <AuthLoading>
        <Loading />
      </AuthLoading>
      <Unauthenticated>
        <Shell>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
                {t("app.tagline")}
              </h1>
              <p className="text-[1.0625rem] leading-relaxed text-ink-2">{t("app.pitch")}</p>
            </div>
            <figure className="flex flex-col gap-2">
              <SampleStub />
              <figcaption className="px-1 text-[0.8125rem] text-ink-3">{t("app.sample")}</figcaption>
            </figure>
          </div>
        </Shell>
        <div className="fixed inset-x-0 bottom-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg">
            <Button type="button" className="w-full" onClick={() => void signIn("google")}>
              <GoogleMark />
              {t("auth.signIn")}
            </Button>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <Viewer />
      </Authenticated>
    </main>
  );
}
