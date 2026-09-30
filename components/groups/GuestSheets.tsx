"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { ErrorLine, Field, FieldInput } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { Member } from "@/components/groups/types";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

/** Přidání člověka bez účtu. `onAdded` dostane jeho id (např. pro rovnou označení ve výdaji). */
export function AddGuestSheet({
  open,
  onClose,
  groupId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  groupId: Id<"groups">;
  onAdded?: (guestId: Id<"users">) => void;
}) {
  const add = useMutation(api.guests.add);
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setError(undefined);
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      const guestId = await add({ groupId, nickname: name });
      toast({ message: t("guest.added", { name: name.trim() }) });
      onAdded?.(guestId);
      onClose();
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
      title={t("guest.add")}
      footer={
        <Button type="submit" form="add-guest" className="w-full" disabled={saving || name.trim() === ""}>
          {saving ? t("common.saving") : t("guest.add.submit")}
        </Button>
      }
    >
      <form id="add-guest" onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("guest.name.label")} htmlFor="guest-name">
          <FieldInput
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("guest.name.placeholder")}
            maxLength={24}
            autoFocus
            autoComplete="off"
          />
        </Field>
        <p className="px-1 text-sm leading-relaxed text-ink-2">{t("guest.add.hint")}</p>
        <ErrorLine>{error}</ErrorLine>
      </form>
    </Sheet>
  );
}

/** Přejmenování nebo odebrání hosta. */
export function EditGuestSheet({
  guest,
  onClose,
  groupId,
}: {
  guest: Member | null;
  onClose: () => void;
  groupId: Id<"groups">;
}) {
  const rename = useMutation(api.guests.rename);
  const remove = useMutation(api.guests.remove);
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guest) {
      setName(guest.nickname);
      setError(undefined);
    }
  }, [guest]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!guest) return;
    setError(undefined);
    setSaving(true);
    try {
      await rename({ groupId, guestId: guest.userId as Id<"users">, nickname: name });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!guest) return;
    setError(undefined);
    setSaving(true);
    try {
      await remove({ groupId, guestId: guest.userId as Id<"users"> });
      toast({ message: t("guest.removed", { name: guest.nickname }) });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={guest !== null}
      onClose={onClose}
      title={t("guest.edit")}
      footer={
        <Button type="submit" form="edit-guest" className="w-full" disabled={saving || name.trim() === ""}>
          {t("guest.rename")}
        </Button>
      }
    >
      <form id="edit-guest" onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("guest.name.label")} htmlFor="edit-guest-name">
          <FieldInput
            id="edit-guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="off"
          />
        </Field>
        <ErrorLine>{error}</ErrorLine>
        <div className="flex flex-col gap-2 pt-2">
          <Button type="button" variant="danger" size="md" disabled={saving} onClick={() => void handleRemove()}>
            {t("guest.remove")}
          </Button>
          <p className="px-1 text-[0.8125rem] text-ink-3">{t("guest.removeHint")}</p>
        </div>
      </form>
    </Sheet>
  );
}
