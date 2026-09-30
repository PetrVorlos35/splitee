"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { ExpenseWithSplits } from "@/components/expenses/types";
import type { Member } from "@/components/groups/types";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { dayKey, dayLabel, formatShort } from "@/lib/format";
import { people, t } from "@/lib/i18n";

/** Feed výdajů po dnech — řádky tiskopisu, vyrovnaný podíl je přeškrtnutý linkou. */
export function ExpenseList({
  expenses,
  members,
  currency,
  viewerId,
  onSelect,
}: {
  expenses: ExpenseWithSplits[];
  members: Member[];
  currency: string;
  viewerId: Id<"users">;
  onSelect: (expense: ExpenseWithSplits) => void;
}) {
  const nicknameOf = (userId: string) => members.find((m) => m.userId === userId)?.nickname ?? "Někdo";
  const now = Date.now();

  const days: { key: number; label: string; items: ExpenseWithSplits[] }[] = [];
  for (const e of expenses) {
    const key = dayKey(e.spentAt);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(e);
    else days.push({ key, label: dayLabel(e.spentAt, now, t("home.today"), t("home.yesterday")), items: [e] });
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-1.5">
          <h3 className="field-label px-1">{day.label}</h3>
          <ul className="overflow-hidden rounded-slip bg-sheet shadow-slip">
            {day.items.map((expense) => {
              const mySplit = expense.splits.find((s) => s.userId === viewerId);
              const iPaid = expense.payerId === viewerId;
              const othersOweMe = iPaid ? expense.amount - (mySplit?.amount ?? 0) : 0;
              return (
                <li key={expense._id} className="border-b border-rule-soft last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelect(expense)}
                    className="flex min-h-16 w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-paper"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-rule text-form"
                    >
                      <CategoryIcon name={expense.category?.name} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{expense.title}</span>
                      <span className="block truncate text-[0.8125rem] text-ink-3">
                        {iPaid ? t("expense.paidByYou") : t("expense.paidBy", { name: nicknameOf(expense.payerId) })}
                        {" · "}
                        {t("expense.people", { people: people(expense.splits.length) })}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-mono font-medium tabular">{formatShort(expense.amount, currency)}</span>
                      {iPaid && othersOweMe > 0 && (
                        <span className="text-[0.8125rem] text-ink-2">
                          {t("expense.youPaid", { amount: formatShort(othersOweMe, currency) })}
                        </span>
                      )}
                      {!iPaid && mySplit && (
                        <span className={`text-[0.8125rem] text-ink ${mySplit.settled ? "line-through decoration-form decoration-1" : ""}`}>
                          {t("expense.yourShare", { amount: formatShort(mySplit.amount, currency) })}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
