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

export default function OnboardingPage() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [nickname, setNickname] = useState("");
  const [accent, setAccent] = useState<string>(MEMBER_COLORS[8].key);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // předvyplň jménem z Google, ale jen jednou a jen když uživatel ještě nepsal
  useEffect(() => {
    if (viewer?.name && nickname === "") setNickname(viewer.name.split(" ")[0]);
  }, [viewer?.name, nickname]);

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
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
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
