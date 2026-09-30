"use client";

import { Plus, Share2, UserPlus } from "lucide-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DigitBoxes } from "@/components/ui/DigitBoxes";
import { Segmented } from "@/components/ui/Segmented";
import { DebtsList } from "@/components/debts/DebtsList";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpenseSheet } from "@/components/expenses/ExpenseSheet";
import type { ExpenseWithSplits } from "@/components/expenses/types";
import { AddGuestSheet } from "@/components/groups/GuestSheets";
import { InviteSheet } from "@/components/groups/InviteSheet";
import { currencySymbol, formatPlain } from "@/lib/format";
import { t } from "@/lib/i18n";

type Period = "thisMonth" | "lastMonth" | "all";

const AVATARS_SHOWN = 4;

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-end justify-between gap-3 px-1">
      <h2 className="text-[0.9375rem] font-semibold tracking-[-0.005em]">{children}</h2>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 pt-4" aria-busy>
      <div className="h-40 animate-pulse rounded-slip bg-sheet/70" />
      <div className="h-16 animate-pulse rounded-slip bg-sheet/70" />
      <div className="h-48 animate-pulse rounded-slip bg-sheet/70" />
    </main>
  );
}

export default function GroupHomePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const gid = groupId as Id<"groups">;

  const group = useQuery(api.groups.get, { groupId: gid });
  const viewer = useQuery(api.users.viewer);
  const categories = useQuery(api.categories.listForGroup, { groupId: gid });
  const debts = useQuery(api.settlements.debts, { groupId: gid });

  const [period, setPeriod] = useState<Period>("all");
  const expenses = useQuery(api.expenses.listForGroup, { groupId: gid, period });

  const [addOpen, setAddOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplits | null>(null);

  if (group === undefined || viewer === undefined) return <Skeleton />;
  if (viewer === null) return null;

  const members = group.members;
  const net = (debts ?? []).reduce(
    (sum, d) => sum + (d.to === viewer._id ? d.amount : 0) - (d.from === viewer._id ? d.amount : 0),
    0,
  );
  const solo = members.length === 1;
  const invite = () => setInviteOpen(true);

  return (
    <>
      <main className="mx-auto flex max-w-lg flex-col gap-7 px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {/* Bilance — hlavní arch tiskopisu, částka vepsaná do políček */}
        <section className="overflow-hidden rounded-slip bg-sheet shadow-slip" aria-label={t("home.balance")}>
          <div className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
            <span className="field-label">{t("home.balance")}</span>
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
              <DigitBoxes
                value={`${net < 0 ? "−" : ""}${formatPlain(net)}`}
              />
              <span className="pb-1.5 font-mono text-xl text-ink-3">{currencySymbol(group.currency)}</span>
            </div>
            <p className="text-[0.9375rem] font-medium text-ink-2">
              {net > 0 ? t("home.balance.plus") : net < 0 ? t("home.balance.minus") : t("home.balance.zero")}
            </p>
          </div>
          <div className="relative">
            <div className="perforation" />
            <span aria-hidden className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full bg-paper shadow-[inset_-1px_0_0_var(--color-rule)]" />
            <span aria-hidden className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rounded-full bg-paper shadow-[inset_1px_0_0_var(--color-rule)]" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            {/* jen prvních pár lidí, zbytek jako „+N" — řádek se nesmí zalamovat */}
            <ul className="flex min-w-0 flex-1 items-center -space-x-1 py-1 pl-1" aria-label={t("home.people")}>
              {members.slice(0, AVATARS_SHOWN).map((m) => (
                <li key={m.userId} title={m.nickname} className="rounded-full ring-2 ring-sheet">
                  <Avatar nickname={m.nickname} image={m.image} colorKey={m.color} isGuest={m.isGuest} size={30} />
                </li>
              ))}
              {members.length > AVATARS_SHOWN && (
                <li className="rounded-full ring-2 ring-sheet">
                  <Link
                    href={`/g/${gid}/settings`}
                    aria-label={t("home.people.more", { count: members.length - AVATARS_SHOWN })}
                    className="flex size-[30px] items-center justify-center rounded-full bg-form-soft font-mono text-xs font-semibold text-form-deep tabular"
                  >
                    +{members.length - AVATARS_SHOWN}
                  </Link>
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setGuestOpen(true)}
              aria-label={t("guest.add")}
              className="flex size-10 items-center justify-center rounded-[6px] border border-rule text-form active:bg-form-soft"
            >
              <UserPlus size={18} />
            </button>
            <button
              type="button"
              onClick={invite}
              className="flex h-10 items-center gap-1.5 rounded-[6px] border border-rule px-3.5 text-sm font-semibold text-form active:bg-form-soft"
            >
              <Share2 size={16} />
              {t("group.members.invite")}
            </button>
          </div>
        </section>

        {solo && (
          <section className="flex flex-col gap-3 rounded-slip border border-dashed border-form/40 bg-form-soft/50 p-4">
            <div>
              <h2 className="font-semibold">{t("home.solo.title")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{t("home.solo.hint")}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="md" className="flex-1 px-3" onClick={invite}>
                <Share2 size={17} />
                {t("group.members.invite")}
              </Button>
              <Button type="button" variant="secondary" size="md" className="flex-1 px-3" onClick={() => setGuestOpen(true)}>
                <UserPlus size={17} />
                {t("guest.add")}
              </Button>
            </div>
          </section>
        )}

        {!solo && (
          <section className="flex flex-col gap-2">
            <SectionTitle>{t("home.debts")}</SectionTitle>
            {debts === undefined ? (
              <div className="h-16 animate-pulse rounded-slip bg-sheet/70" />
            ) : (
              <DebtsList groupId={gid} currency={group.currency} viewerId={viewer._id} members={members} debts={debts} />
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle>{t("home.expenses")}</SectionTitle>
          <Segmented
            label={t("period.label")}
            value={period}
            onChange={setPeriod}
            options={(["all", "thisMonth", "lastMonth"] as const).map((p) => ({ value: p, label: t(`period.${p}`) }))}
          />
          {expenses === undefined || categories === undefined ? (
            <div className="h-48 animate-pulse rounded-slip bg-sheet/70" />
          ) : expenses.length === 0 ? (
            <div className="rounded-slip border border-dashed border-rule px-5 py-8 text-center">
              <p className="font-medium">{period === "all" ? t("home.expenses.empty") : t("home.expenses.emptyPeriod")}</p>
              {period === "all" && <p className="mt-1 text-sm text-ink-2">{t("home.expenses.emptyHint")}</p>}
            </div>
          ) : (
            <ExpenseList
              expenses={expenses}
              members={members}
              currency={group.currency}
              viewerId={viewer._id}
              onSelect={setEditingExpense}
            />
          )}
        </section>
      </main>

      {/* Hlavní akce pod palcem — přes celou šířku, nad bezpečnou zónou */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        disabled={categories === undefined}
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-form pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-base font-semibold text-form-ink transition-colors duration-100 active:bg-form-deep disabled:bg-form/60"
      >
        <Plus size={20} strokeWidth={2.4} />
        {t("expense.add")}
      </button>

      {categories !== undefined && (
        <ExpenseSheet
          open={addOpen || editingExpense !== null}
          onClose={() => {
            setAddOpen(false);
            setEditingExpense(null);
          }}
          groupId={gid}
          currency={group.currency}
          members={members}
          categories={categories}
          viewerId={viewer._id}
          expense={editingExpense}
        />
      )}
      <AddGuestSheet open={guestOpen} onClose={() => setGuestOpen(false)} groupId={gid} />
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} code={group.inviteCode} groupName={group.name} />
    </>
  );
}
