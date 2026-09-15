"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { MEMBER_COLORS } from "@/lib/colors";
import { t } from "@/lib/i18n";
import { errorMessage } from "@/lib/errors";

export default function OnboardingPage() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [nickname, setNickname] = useState("");
  const [accent, setAccent] = useState<string>(MEMBER_COLORS[8].key);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // předvyplň jménem z Google, ale jen jednou. Funkční updater čte aktuální
  // nickname bez toho, aby musel být v deps — kdyby tam byl, smazání pole na
  // "" by tenhle efekt spustilo znovu a přezdívku by to hned napsalo zpátky
  // (uživatel by nikdy nedostal šanci napsat něco jiného).
  useEffect(() => {
    if (viewer?.name) {
      setNickname((current) => (current === "" ? viewer.name!.split(" ")[0] : current));
    }
  }, [viewer?.name]);

  // uživatel má z afterUserCreatedOrUpdated už přidělený výchozí akcent —
  // předvyplň ho, ať výběr barvy navazuje na to, co reálně bude uloženo
  useEffect(() => {
    if (viewer?.accentColor) setAccent(viewer.accentColor);
  }, [viewer?.accentColor]);

  // kdo už onboarding dokončil, tady nemá co dělat
  useEffect(() => {
    if (viewer?.nickname) router.replace("/");
  }, [viewer?.nickname, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      await completeOnboarding({ nickname, accentColor: accent });
      // Vždy "/" — ne rozdělaný vstup do party rovnou odsud. Kdyby tenhle
      // efekt (dokonči vstup do party) a "kdo už onboarding dokončil, tady
      // nemá co dělat" (řádek výše, reaguje na stejnou reaktivní změnu
      // viewer.nickname) obě volaly router.replace na základě stejné
      // aktualizace, vyhrál by, co doběhne poslední — nedeterministicky. "/"
      // je proto jediný spotřebitel PENDING_INVITE_KEY (viz app/page.tsx);
      // ten po přihlášeném + onboardovaném uživateli beze skupin i tak
      // pošle rovnou do /join/<kód>, takže žádná funkčnost se neztrácí,
      // jen se z toho stává jedno serializované místo místo dvou závodících.
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("onboarding.title")}</h1>

      <form onSubmit={submit} className="flex flex-col gap-8">
        <Field label={t("onboarding.nickname.label")} htmlFor="nickname" error={error}>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("onboarding.nickname.placeholder")}
            maxLength={24}
            autoFocus
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-lg outline-none focus:border-black"
          />
        </Field>

        <Field
          label={t("onboarding.color.label")}
          htmlFor="color"
          hint={t("onboarding.color.hint")}
        >
          <div id="color">
            <ColorPicker value={accent} onChange={setAccent} />
          </div>
        </Field>

        <Button type="submit" disabled={saving || nickname.trim() === ""}>
          {t("onboarding.submit")}
        </Button>
      </form>
    </main>
  );
}
