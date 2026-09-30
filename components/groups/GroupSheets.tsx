"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { ErrorLine, Field, FieldInput, GroupLabel } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

const GROUP_EMOJI = ["🏠", "🏔️", "🏖️", "🎪", "🍻", "🚗", "✈️", "⛺", "🎿", "🍕", "🎉", "💼"];

/**
 * Formulář na založení party. Používá ho přepínač party (další parta) i
 * úvodní obrazovka (úplně první parta). `onCreated` rozhodne, kam navigovat.
 */
export function CreateGroupSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (groupId: Id<"groups">) => void;
}) {
  const create = useMutation(api.groups.create);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(GROUP_EMOJI[0]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      const groupId = await create({ name, emoji, currency: "CZK" });
      setName("");
      setEmoji(GROUP_EMOJI[0]);
      onCreated(groupId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("group.create")}
      footer={
        <Button type="submit" form="create-group" className="w-full" disabled={saving || name.trim() === ""}>
          {saving ? t("common.saving") : t("group.create.submit")}
        </Button>
      }
    >
      <form id="create-group" onSubmit={submit} className="flex flex-col gap-5">
        <Field label={t("group.name.label")} htmlFor="group-name">
          <FieldInput
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("group.name.placeholder")}
            maxLength={40}
            autoFocus
            autoComplete="off"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <GroupLabel>{t("group.emoji.label")}</GroupLabel>
          <div role="radiogroup" aria-label={t("group.emoji.label")} className="grid grid-cols-6 gap-2">
            {GROUP_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={emoji === e}
                onClick={() => setEmoji(e)}
                className={`flex aspect-square items-center justify-center rounded-[6px] border text-2xl transition-colors duration-100 ${
                  emoji === e ? "border-form bg-form-soft" : "border-rule bg-sheet"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <ErrorLine>{error}</ErrorLine>
      </form>
    </Sheet>
  );
}

/** Ruční zadání kódu party (ne přes odkaz). */
export function JoinByCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    // přes /join — tam se vybírá, jestli je uživatel jeden z hostů
    router.push(`/join/${encodeURIComponent(normalized)}`);
    setCode("");
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("group.join")}
      footer={
        <Button type="submit" form="join-code-form" className="w-full" disabled={code.trim() === ""}>
          {t("group.join.submit")}
        </Button>
      }
    >
      <form id="join-code-form" onSubmit={submit}>
        <Field label={t("group.code.label")} htmlFor="join-code">
          <FieldInput
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("group.code.placeholder")}
            maxLength={8}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            className="font-mono text-2xl tracking-[0.3em] uppercase"
          />
        </Field>
      </form>
    </Sheet>
  );
}
