"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { CreateGroupSheet } from "@/components/groups/GroupSwitcher";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

// stejný literál jako v app/join/[code]/page.tsx (tam se nastavuje). "/" je
// JEDINÝ, kdo tenhle klíč čte a maže — onboarding ho záměrně nekonzumuje,
// aby dvě konkurenční router.replace volání ze stejné reaktivní aktualizace
// (dokonči vstup do party vs. "onboarding hotový, jdi domů") nezávodila o
// to, co doběhne poslední. Viz komentář u handledEntry níž.
const PENDING_INVITE_KEY = "splitee.pendingInviteCode";

/** Uživatel je přihlášený a onboardovaný, kód zadává ručně (ne přes odkaz). */
function JoinByCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const join = useMutation(api.groups.joinByCode);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [joining, setJoining] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setJoining(true);
    try {
      const groupId = await join({ code });
      setCode("");
      router.push(`/g/${groupId}`);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("group.join")}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label={t("group.code.enter")} htmlFor="join-code" error={error}>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("group.code.placeholder")}
            maxLength={8}
            autoFocus
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-center text-lg uppercase tracking-[0.2em] outline-none focus:border-black"
          />
        </Field>

        <Button type="submit" disabled={joining || code.trim() === ""}>
          {t("group.join")}
        </Button>
      </form>
    </Sheet>
  );
}

/** Přihlášený a onboardovaný, ale zatím v žádné partě. */
function NoGroup() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("group.empty.title")}</h1>
        <p className="mt-2 text-neutral-600">{t("group.empty.hint")}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          {t("group.create")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setJoinOpen(true)}>
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

  if (viewer === undefined || (viewer && !viewer.nickname)) {
    return <p className="p-8">{t("auth.loading")}</p>;
  }

  if (groups === undefined || redirecting) {
    return <p className="p-8">{t("auth.loading")}</p>;
  }

  return (
    <>
      <NoGroup />
      <div className="flex justify-center pb-8">
        <button onClick={() => void signOut()} className="text-sm underline">
          {t("auth.signOut")}
        </button>
      </div>
    </>
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
