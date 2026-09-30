"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { ErrorLine, Field, FieldInput, GroupLabel } from "@/components/ui/Field";
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <form onSubmit={submit} className="flex flex-1 flex-col gap-7 pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-balance">
            {t("onboarding.title")}
          </h1>
          <p className="leading-relaxed text-ink-2">{t("onboarding.hint")}</p>
        </div>

        <Field label={t("onboarding.nickname.label")} htmlFor="nickname">
          <FieldInput
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("onboarding.nickname.placeholder")}
            maxLength={24}
            autoFocus
            autoComplete="nickname"
          />
        </Field>

        <div className="flex flex-col gap-2.5">
          <GroupLabel>{t("onboarding.color.label")}</GroupLabel>
          <ColorPicker value={accent} onChange={setAccent} label={t("onboarding.color.label")} />
        </div>

        <ErrorLine>{error}</ErrorLine>

        <Button type="submit" className="mt-auto w-full" disabled={saving || nickname.trim() === ""}>
          {saving ? t("common.saving") : t("onboarding.submit")}
        </Button>
      </form>
    </main>
  );
}
