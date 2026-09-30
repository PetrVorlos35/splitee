"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ChevronLeft, LogOut } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { ErrorLine, Field, FieldInput, GroupLabel } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { MEMBER_COLORS } from "@/lib/colors";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

export default function ProfilePage() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const updateProfile = useMutation(api.users.updateProfile);
  const { signOut } = useAuthActions();
  const toast = useToast();

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

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      await updateProfile({ nickname, accentColor: accent });
      toast({ message: t("profile.saved") });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!viewer) return null;

  const dirty = nickname !== (viewer.nickname ?? "") || accent !== viewer.accentColor;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-7 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex h-14 items-center">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="-ml-2 flex h-11 items-center gap-1 rounded-[6px] pr-3 pl-1 text-[0.9375rem] font-medium text-form active:bg-form-soft"
        >
          <ChevronLeft size={20} />
          {t("common.back")}
        </button>
      </div>

      <div className="-mt-4 flex items-center gap-4 px-1">
        <Avatar nickname={nickname || "?"} image={viewer.image} colorKey={accent} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]">{t("profile.title")}</h1>
          {viewer.email && <p className="truncate text-sm text-ink-3">{viewer.email}</p>}
        </div>
      </div>

      <form onSubmit={save} className="flex flex-col gap-6">
        <Field label={t("onboarding.nickname.label")} htmlFor="nickname">
          <FieldInput id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} autoComplete="nickname" />
        </Field>

        <div className="flex flex-col gap-2.5">
          <GroupLabel>{t("onboarding.color.label")}</GroupLabel>
          <ColorPicker value={accent} onChange={setAccent} label={t("onboarding.color.label")} />
          <p className="px-1 text-[0.8125rem] text-ink-3">{t("onboarding.hint")}</p>
        </div>

        <ErrorLine>{error}</ErrorLine>

        <Button type="submit" disabled={saving || !dirty || nickname.trim() === ""}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </form>

      <Button type="button" variant="secondary" className="mt-auto" onClick={() => void signOut().then(() => router.replace("/"))}>
        <LogOut size={18} className="text-owe" />
        {t("auth.signOut")}
      </Button>
    </main>
  );
}
