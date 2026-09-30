"use client";

import { Check, Lock, UserPlus } from "lucide-react";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorLine, Field, FieldInput, GroupLabel } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { CategoryPicker } from "@/components/expenses/CategoryPicker";
import type { ExpenseWithSplits } from "@/components/expenses/types";
import { AddGuestSheet } from "@/components/groups/GuestSheets";
import type { Member } from "@/components/groups/types";
import { parseAmount } from "@/convex/lib/money";
import { splitEqual, splitShares } from "@/convex/lib/split";
import { errorMessage } from "@/lib/errors";
import { currencySymbol, formatShort } from "@/lib/format";
import { t } from "@/lib/i18n";

type SplitMode = "equal" | "exact" | "shares";
type ParticipantState = { selected: boolean; exact: string; weight: string };
type ParticipantArg = { userId: Id<"users">; weight?: number; amount?: number };

function haleruToPlain(haleru: number): string {
  return haleru % 100 === 0 ? String(haleru / 100) : (haleru / 100).toFixed(2).replace(".", ",");
}

function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Poledne místního dne, ne půlnoc — bezpečně uvnitř dne bez ohledu na DST posun. */
function fromDateInputValue(value: string): number {
  return new Date(`${value}T12:00:00`).getTime();
}

function parseHaleruLoose(raw: string): number {
  const cleaned = raw.trim().replace(/[\s ]/g, "").replace(",", ".");
  if (cleaned === "" || !/^\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 100);
}

function parseWeight(raw: string): number {
  return Number(raw.trim().replace(",", "."));
}

/** Podíly výdaje jako vstup pro create — z uložených splits, aby šel smazaný výdaj vrátit přes Zpět. */
export function participantsFromExpense(expense: ExpenseWithSplits): ParticipantArg[] {
  return expense.splits.map((s) => ({
    userId: s.userId,
    ...(expense.splitMode === "shares" ? { weight: s.weight ?? 1 } : {}),
    ...(expense.splitMode === "exact" ? { amount: s.amount } : {}),
  }));
}

/**
 * Formulář na založení i úpravu výdaje — `expense === null` je "přidat",
 * `expense` s daty je "upravit" (prefill z jeho aktuálních podílů).
 * Jeden sdílený formulář, ne dvě kopie, aby validace zůstala na jednom místě.
 */
export function ExpenseSheet({
  open,
  onClose,
  groupId,
  currency,
  members,
  categories,
  viewerId,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  groupId: Id<"groups">;
  currency: string;
  members: Member[];
  categories: Doc<"categories">[];
  viewerId: Id<"users">;
  expense: ExpenseWithSplits | null;
}) {
  const create = useMutation(api.expenses.create);
  const update = useMutation(api.expenses.update);
  const remove = useMutation(api.expenses.remove);
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(() => toDateInputValue(Date.now()));
  const [note, setNote] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [participants, setParticipants] = useState<Record<string, ParticipantState>>({});
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  // members/categories mění identitu při každé reaktivní aktualizaci party —
  // přes ref, ať reset formuláře běží jen při skutečném otevření/přepnutí cíle
  const membersRef = useRef(members);
  membersRef.current = members;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  useEffect(() => {
    if (!open) return;
    setError(undefined);
    setConfirmDelete(false);

    if (expense) {
      setTitle(expense.title);
      setAmount(haleruToPlain(expense.amount));
      setPayerId(expense.payerId);
      setCategoryId(expense.categoryId);
      setDate(toDateInputValue(expense.spentAt));
      setNote(expense.note ?? "");
      setSplitMode(expense.splitMode);

      const map: Record<string, ParticipantState> = {};
      for (const m of membersRef.current) {
        const split = expense.splits.find((s) => s.userId === m.userId);
        map[m.userId] = {
          selected: split !== undefined,
          exact: split ? haleruToPlain(split.amount) : "",
          weight: split?.weight !== undefined ? String(split.weight) : "1",
        };
      }
      setParticipants(map);
    } else {
      setTitle("");
      setAmount("");
      setPayerId(viewerId);
      setCategoryId(categoriesRef.current[0]?._id ?? "");
      setDate(toDateInputValue(Date.now()));
      setNote("");
      setSplitMode("equal");

      const map: Record<string, ParticipantState> = {};
      for (const m of membersRef.current) map[m.userId] = { selected: true, exact: "", weight: "1" };
      setParticipants(map);
    }
  }, [open, expense, viewerId]);

  // nově přidaný člen (typicky host přidaný přímo odsud) se rovnou zaškrtne
  useEffect(() => {
    if (!open) return;
    setParticipants((prev) => {
      const missing = members.filter((m) => prev[m.userId] === undefined);
      if (missing.length === 0) return prev;
      const next = { ...prev };
      for (const m of missing) next[m.userId] = { selected: true, exact: "", weight: "1" };
      return next;
    });
  }, [open, members]);

  function toggleParticipant(userId: string) {
    setParticipants((prev) => ({ ...prev, [userId]: { ...prev[userId], selected: !prev[userId]?.selected } }));
  }

  function setAll(selected: boolean) {
    setParticipants((prev) =>
      Object.fromEntries(Object.entries(prev).map(([id, row]) => [id, { ...row, selected }])),
    );
  }

  function updateParticipant(userId: string, patch: Partial<Pick<ParticipantState, "exact" | "weight">>) {
    setParticipants((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
  }

  const selectedMembers = members.filter((m) => participants[m.userId]?.selected);
  const allSelected = selectedMembers.length === members.length;
  const amountHaleru = parseHaleruLoose(amount);

  // Živý náhled podílů — stejné funkce jako na serveru, takže co vidíš, to se uloží.
  const preview = useMemo(() => {
    if (!Number.isSafeInteger(amountHaleru) || amountHaleru <= 0 || selectedMembers.length === 0) return null;
    const withOrder = selectedMembers.map((m) => ({
      userId: m.userId,
      joinedAt: m.joinedAt,
      weight: parseWeight(participants[m.userId]?.weight ?? "1"),
    }));
    try {
      if (splitMode === "equal") return new Map(splitEqual(amountHaleru, withOrder).map((r) => [r.userId, r.amount]));
      if (splitMode === "shares") return new Map(splitShares(amountHaleru, withOrder).map((r) => [r.userId, r.amount]));
    } catch {
      return null;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountHaleru, splitMode, participants, members]);

  const remainingExact = useMemo(() => {
    if (splitMode !== "exact" || !Number.isFinite(amountHaleru)) return null;
    const entered = selectedMembers.reduce((sum, m) => {
      const v = parseHaleruLoose(participants[m.userId]?.exact ?? "");
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    return amountHaleru - entered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitMode, amountHaleru, participants, members]);

  const locked =
    expense !== null &&
    expense.splits.some((s) => s.settlementId !== undefined || (s.settled && s.userId !== s.payerId));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);

    let total: number;
    try {
      total = parseAmount(amount);
    } catch (e) {
      setError(errorMessage(e));
      return;
    }

    if (selectedMembers.length === 0) {
      setError(t("error.noParticipants"));
      return;
    }

    let participantArgs: ParticipantArg[];
    if (splitMode === "shares") {
      participantArgs = selectedMembers.map((m) => ({
        userId: m.userId as Id<"users">,
        weight: parseWeight(participants[m.userId]?.weight ?? "1"),
      }));
      if (participantArgs.some((p) => !Number.isFinite(p.weight) || (p.weight as number) <= 0)) {
        setError(t("error.weightInvalid"));
        return;
      }
    } else if (splitMode === "exact") {
      participantArgs = selectedMembers.map((m) => ({
        userId: m.userId as Id<"users">,
        amount: parseHaleruLoose(participants[m.userId]?.exact ?? ""),
      }));
      if (participantArgs.some((p) => !Number.isSafeInteger(p.amount) || (p.amount as number) < 0)) {
        setError(t("error.splitAmountInvalid"));
        return;
      }
      if (participantArgs.reduce((s, p) => s + (p.amount ?? 0), 0) !== total) {
        setError(t("split.mismatch"));
        return;
      }
    } else {
      participantArgs = selectedMembers.map((m) => ({ userId: m.userId as Id<"users"> }));
    }

    setSaving(true);
    try {
      const payload = {
        payerId: payerId as Id<"users">,
        amount: total,
        title,
        note: note.trim() === "" ? undefined : note,
        categoryId: categoryId as Id<"categories">,
        spentAt: fromDateInputValue(date),
        splitMode,
        participants: participantArgs,
      };
      if (expense) {
        await update({ expenseId: expense._id, ...payload });
      } else {
        await create({ groupId, ...payload });
        toast({ message: t("expense.created") });
      }
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!expense) return;
    setSaving(true);
    setError(undefined);
    try {
      await remove({ expenseId: expense._id });
      const restore = {
        groupId,
        payerId: expense.payerId,
        amount: expense.amount,
        title: expense.title,
        note: expense.note,
        categoryId: expense.categoryId,
        spentAt: expense.spentAt,
        splitMode: expense.splitMode,
        participants: participantsFromExpense(expense),
      };
      toast({ message: t("expense.deleted"), undo: () => create(restore) });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !saving && !locked && title.trim() !== "" && amount.trim() !== "" && categoryId !== "" && payerId !== "";
  const symbol = currencySymbol(currency);

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={expense ? t("expense.edit") : t("expense.add")}
        footer={
          <Button type="submit" form="expense-form" className="w-full" disabled={!canSubmit}>
            {saving
              ? t("common.saving")
              : Number.isSafeInteger(amountHaleru) && amountHaleru > 0
                ? t("expense.saveAmount", { amount: formatShort(amountHaleru, currency) })
                : t("expense.save")}
          </Button>
        }
      >
        <form id="expense-form" onSubmit={submit} className="flex flex-col gap-5">
          {locked && (
            <p className="flex gap-2.5 rounded-[6px] bg-form-soft px-3.5 py-3 text-sm text-form-deep">
              <Lock size={16} className="mt-0.5 shrink-0" />
              {t("expense.locked")}
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <Field label={t("expense.amount.label")} htmlFor="expense-amount">
              <span className="flex items-baseline gap-2">
                <FieldInput
                  id="expense-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={t("expense.amount.placeholder")}
                  autoFocus={!expense}
                  autoComplete="off"
                  className="font-mono text-[2.25rem] leading-tight font-medium tabular"
                />
                <span className="font-mono text-xl text-ink-3">{symbol}</span>
              </span>
            </Field>

            <Field label={t("expense.title.label")} htmlFor="expense-title">
              <FieldInput
                id="expense-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("expense.title.placeholder")}
                autoComplete="off"
                enterKeyHint="done"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <GroupLabel>{t("expense.payer.label")}</GroupLabel>
            <div role="radiogroup" aria-label={t("expense.payer.label")} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {members.map((m) => {
                const active = payerId === m.userId;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPayerId(m.userId)}
                    className={`flex h-11 shrink-0 items-center gap-2 rounded-[6px] border pr-4 pl-1.5 text-[0.9375rem] font-medium transition-colors duration-100 ${
                      active ? "border-form bg-form-soft text-form-deep" : "border-rule bg-sheet"
                    }`}
                  >
                    <Avatar nickname={m.nickname} image={m.image} colorKey={m.color} isGuest={m.isGuest} size={30} />
                    {m.userId === viewerId ? t("common.youCap") : m.nickname}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <GroupLabel
              action={
                <button
                  type="button"
                  onClick={() => setAll(!allSelected)}
                  className="-mr-1 h-8 rounded-md px-2 text-sm font-medium text-form active:bg-form-soft"
                >
                  {allSelected ? t("expense.participants.none") : t("expense.participants.all")}
                </button>
              }
            >
              {t("expense.participants.label")}
            </GroupLabel>

            <Segmented
              label={t("split.mode.label")}
              value={splitMode}
              onChange={setSplitMode}
              options={(["equal", "exact", "shares"] as const).map((mode) => ({ value: mode, label: t(`split.${mode}`) }))}
            />

            <ul className="overflow-hidden rounded-slip border border-rule bg-sheet">
              {members.map((m) => {
                const row = participants[m.userId] ?? { selected: false, exact: "", weight: "1" };
                const share = preview?.get(m.userId);
                return (
                  <li key={m.userId} className="flex min-h-14 items-center gap-3 border-b border-rule-soft pr-3 last:border-b-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={row.selected}
                      onClick={() => toggleParticipant(m.userId)}
                      className="flex min-h-14 min-w-0 flex-1 items-center gap-3 pl-3.5 text-left"
                    >
                      <span
                        aria-hidden
                        className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors duration-100 ${
                          row.selected ? "border-form bg-form text-white" : "border-rule bg-sheet"
                        }`}
                      >
                        {row.selected && <Check size={14} strokeWidth={3} />}
                      </span>
                      <Avatar nickname={m.nickname} image={m.image} colorKey={m.color} isGuest={m.isGuest} size={28} />
                      <span className={`truncate font-medium ${row.selected ? "" : "text-ink-3"}`}>
                        {m.nickname}
                        {m.userId === viewerId && <span className="font-normal text-ink-3"> · {t("common.you")}</span>}
                      </span>
                    </button>

                    {row.selected && splitMode === "exact" && (
                      <span className="flex items-baseline gap-1 rounded-[4px] border border-rule px-2 focus-within:border-form">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${m.nickname} — ${t("expense.amount.label")}`}
                          value={row.exact}
                          onChange={(e) => updateParticipant(m.userId, { exact: e.target.value })}
                          placeholder="0"
                          className="h-9 w-20 bg-transparent text-right font-mono tabular outline-none"
                        />
                        <span className="text-sm text-ink-3">{symbol}</span>
                      </span>
                    )}
                    {row.selected && splitMode === "shares" && (
                      <span className="flex items-center gap-2">
                        <span className="w-16 text-right font-mono text-sm text-ink-3 tabular">
                          {share !== undefined ? formatShort(share, currency) : ""}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${m.nickname} — ${t("split.weight")}`}
                          value={row.weight}
                          onChange={(e) => updateParticipant(m.userId, { weight: e.target.value })}
                          className="h-9 w-12 rounded-[4px] border border-rule text-center font-mono tabular outline-none focus:border-form"
                        />
                      </span>
                    )}
                    {row.selected && splitMode === "equal" && share !== undefined && (
                      <span className="font-mono text-[0.9375rem] tabular text-ink-2">{formatShort(share, currency)}</span>
                    )}
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => setAddGuestOpen(true)}
                  className="flex min-h-13 w-full items-center gap-3 px-3.5 text-left font-medium text-form active:bg-paper"
                >
                  <UserPlus size={20} />
                  {t("guest.add")}
                </button>
              </li>
            </ul>
            {remainingExact !== null && remainingExact !== 0 && (
              <p className={`px-1 text-sm ${remainingExact < 0 ? "text-owe" : "text-ink-2"}`}>
                {remainingExact > 0
                  ? t("split.remaining", { amount: formatShort(remainingExact, currency) })
                  : t("split.over", { amount: formatShort(-remainingExact, currency) })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <GroupLabel>{t("expense.category.label")}</GroupLabel>
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} label={t("expense.category.label")} />
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2.5">
            <Field label={t("expense.date.label")} htmlFor="expense-date">
              <FieldInput
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-7 w-[8.5rem] text-base"
              />
            </Field>
            <Field label={t("expense.note.label")} htmlFor="expense-note">
              <FieldInput
                id="expense-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("expense.note.placeholder")}
                autoComplete="off"
                className="min-h-7 text-base"
              />
            </Field>
          </div>

          <ErrorLine>{error}</ErrorLine>

          {expense && !locked &&
            (confirmDelete ? (
              <div className="flex flex-col gap-2.5 rounded-slip border border-owe/30 bg-owe-soft p-3.5">
                <p className="text-sm text-owe">{t("expense.deleteConfirm")}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" variant="danger" size="md" className="flex-1" disabled={saving} onClick={() => void handleDelete()}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="quiet" size="md" className="self-start !text-owe" onClick={() => setConfirmDelete(true)}>
                {t("expense.delete")}
              </Button>
            ))}
        </form>
      </Sheet>

      <AddGuestSheet open={addGuestOpen} onClose={() => setAddGuestOpen(false)} groupId={groupId} />
    </>
  );
}
