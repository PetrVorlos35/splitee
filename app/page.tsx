"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { CreateGroupSheet } from "@/components/groups/GroupSwitcher";
import { errorMessage, t } from "@/lib/i18n";

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

  // middleware hlídá jen přihlášení — dokončený onboarding se pozná až tady,
  // z Convex dotazu, a bez přezdívky appku pustit dál nedáme
  useEffect(() => {
    if (viewer && !viewer.nickname) router.replace("/onboarding");
  }, [viewer, router]);

  // kdo už má partu, na rozcestí nemá co dělat — jde rovnou dovnitř
  useEffect(() => {
    if (groups && groups.length > 0) {
      router.replace(`/g/${viewer?.lastGroupId ?? groups[0]._id}`);
    }
  }, [groups, viewer?.lastGroupId, router]);

  if (viewer === undefined || (viewer && !viewer.nickname)) {
    return <p className="p-8">{t("auth.loading")}</p>;
  }

  if (groups === undefined || groups.length > 0) {
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
