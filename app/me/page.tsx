"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { colorByKey, MEMBER_COLORS } from "@/lib/colors";
import { t } from "@/lib/i18n";

export default function ProfilePage() {
  const viewer = useQuery(api.users.viewer);
  const updateProfile = useMutation(api.users.updateProfile);
  const { signOut } = useAuthActions();

  const [nickname, setNickname] = useState("");
  const [accent, setAccent] = useState<string>(MEMBER_COLORS[8].key);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // formulář drží vlastní stav, ale startuje z toho, co v Convexu opravdu je
  useEffect(() => {
    if (viewer?.nickname !== undefined) setNickname(viewer.nickname);
  }, [viewer?.nickname]);

  useEffect(() => {
    if (viewer?.accentColor) setAccent(viewer.accentColor);
  }, [viewer?.accentColor]);

  // reaktivní dotaz na viewer.accentColor propisuje barvu do CSS proměnné na
  // <body> — jakmile mutace uloží novou barvu, appka se překreslí bez refreshe
  useEffect(() => {
    if (viewer?.accentColor) {
      document.body.style.setProperty("--accent", colorByKey(viewer.accentColor).hex);
    }
  }, [viewer?.accentColor]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      await updateProfile({ nickname, accentColor: accent });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!viewer) return null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 p-6">
      <div className="flex items-center gap-4 pt-6">
        {viewer.image && (
          // Google avatar je z cizí domény — obyčejný <img>, ne next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewer.image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full"
          />
        )}
        <div>
          <p className="text-lg font-medium">{viewer.name}</p>
          {viewer.email && <p className="text-sm text-neutral-500">{viewer.email}</p>}
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{t("profile.title")}</h1>

      <form onSubmit={save} className="flex flex-col gap-8">
        <Field label={t("onboarding.nickname.label")} htmlFor="nickname" error={error}>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
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

        <Button type="submit" variant="primary" disabled={saving || nickname.trim() === ""}>
          {t("profile.save")}
        </Button>
      </form>

      <Button type="button" variant="danger" onClick={() => void signOut()}>
        {t("auth.signOut")}
      </Button>
    </main>
  );
}
