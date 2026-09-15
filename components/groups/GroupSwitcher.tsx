"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

/**
 * Formulář na založení nové party. Používá ji jak GroupSwitcher (přidat další
 * partu, když už v jedné jsi), tak `app/page.tsx` (úplně první parta).
 * `onCreated` dostane nové groupId — volající rozhodne, kam navigovat.
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
  const [emoji, setEmoji] = useState("🏠");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      const groupId = await create({ name, emoji, currency: "CZK" });
      setName("");
      setEmoji("🏠");
      onCreated(groupId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("group.create")}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label={t("group.name.label")} htmlFor="group-name" error={error}>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("group.name.placeholder")}
            maxLength={40}
            autoFocus
            className="rounded-2xl border border-neutral-200 px-4 py-3 text-lg outline-none focus:border-black"
          />
        </Field>

        <Field label={t("group.emoji.label")} htmlFor="group-emoji">
          <input
            id="group-emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            className="w-20 rounded-2xl border border-neutral-200 px-4 py-3 text-center text-2xl outline-none focus:border-black"
          />
        </Field>

        <Button type="submit" disabled={saving || name.trim() === ""}>
          {t("group.create")}
        </Button>
      </form>
    </Sheet>
  );
}

/** Přepínač party v hlavičce `/g/[groupId]` — jen mezi partami, kde už jsem. */
export function GroupSwitcher({ currentGroupId }: { currentGroupId: Id<"groups"> }) {
  const router = useRouter();
  const groups = useQuery(api.groups.listMine);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const current = groups?.find((g) => g._id === currentGroupId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-left"
      >
        <span className="text-xl">{current?.emoji ?? "…"}</span>
        <span className="font-medium">{current?.name ?? ""}</span>
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
          {groups?.map((g) => (
            <button
              key={g._id}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push(`/g/${g._id}`);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${
                g._id === currentGroupId ? "bg-neutral-100" : ""
              }`}
            >
              <span className="text-xl">{g.emoji}</span>
              <span>{g.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setCreateOpen(true);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-neutral-600"
          >
            <span className="text-xl">+</span>
            <span>{t("group.switcher.newGroup")}</span>
          </button>
        </div>
      )}

      <CreateGroupSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(groupId) => {
          setCreateOpen(false);
          router.push(`/g/${groupId}`);
        }}
      />
    </div>
  );
}
