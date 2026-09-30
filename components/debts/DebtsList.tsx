"use client";

import { ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorLine } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { Member } from "@/components/groups/types";
import { errorMessage } from "@/lib/errors";
import { formatShort } from "@/lib/format";
import { t } from "@/lib/i18n";

export type Debt = {
  from: Id<"users">;
  to: Id<"users">;
  amount: number;
  fromNickname: string;
  fromColor: string;
  toNickname: string;
  toColor: string;
};

type Ctx = {
  groupId: Id<"groups">;
  currency: string;
  viewerId: Id<"users">;
  members: Member[];
};

function useDebtActions({ groupId, viewerId, members }: Ctx) {
  const settleTransfer = useMutation(api.settlements.settleTransfer);
  const unsettleSettlement = useMutation(api.settlements.unsettleSettlement);
  const toast = useToast();
  const isGuest = (id: string) => members.find((m) => m.userId === id)?.isGuest ?? false;

  /** Jedná volající za jednu ze stran? Sám za sebe, nebo za hosta (viz convex/settlements.ts canActOn). */
  function canAct(debt: Debt) {
    return debt.from === viewerId || debt.to === viewerId || isGuest(debt.from) || isGuest(debt.to);
  }

  async function settle(debt: Debt) {
    const settlementId = await settleTransfer({ groupId, from: debt.from, to: debt.to, amount: debt.amount });
    toast({
      message: `${t("debt.settled")}: ${debt.fromNickname} → ${debt.toNickname}`,
      undo: () => unsettleSettlement({ settlementId }),
    });
  }

  return { canAct, settle };
}

function debtTitle(debt: Debt, viewerId: string) {
  if (debt.to === viewerId) return t("debt.owesYou", { name: debt.fromNickname });
  if (debt.from === viewerId) return t("debt.youOwe", { name: debt.toNickname });
  return t("debt.owes", { from: debt.fromNickname, to: debt.toNickname });
}

/**
 * „Kdo komu" jako ústřižky poukázek: zjednodušené převody celé party, vlevo
 * kdo komu a kolik pošle (klepnutím vysvětlení z bilancí), za perforací
 * vpravo odtržení = zaplaceno.
 */
export function DebtsList({ debts, ...ctx }: Ctx & { debts: Debt[] }) {
  const { canAct, settle } = useDebtActions(ctx);
  const [open, setOpen] = useState<Debt | null>(null);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const memberOf = (id: string) => ctx.members.find((m) => m.userId === id);

  if (debts.length === 0) {
    return (
      <p className="rounded-slip border border-dashed border-rule px-4 py-5 text-center text-sm text-ink-2">
        {t("home.debts.none")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorLine>{error}</ErrorLine>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
        {debts.map((debt) => {
          const key = `${debt.from}>${debt.to}`;
          const from = memberOf(debt.from);
          const to = memberOf(debt.to);
          return (
            // vyrovnaný dluh z dotazu zmizí — ústřižek se „odtrhne" doprava
            <motion.li
              key={key}
              layout
              exit={{ opacity: 0, x: 72, rotate: 2.5, transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
              className="relative flex overflow-hidden rounded-slip bg-sheet shadow-slip"
            >
              <button
                type="button"
                onClick={() => setOpen(debt)}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-3.5 text-left active:bg-paper"
              >
                <span className="flex shrink-0 items-center">
                  <Avatar nickname={debt.fromNickname} image={from?.image} colorKey={debt.fromColor} isGuest={from?.isGuest} size={30} />
                  <ArrowRight size={14} className="mx-0.5 text-ink-3" />
                  <Avatar nickname={debt.toNickname} image={to?.image} colorKey={debt.toColor} isGuest={to?.isGuest} size={30} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-medium">{debtTitle(debt, ctx.viewerId)}</span>
                  <span className={`block font-mono text-lg font-medium tabular text-ink`}>
                    {formatShort(debt.amount, ctx.currency)}
                  </span>
                </span>
              </button>
              {canAct(debt) && (
                <div className="relative flex shrink-0 items-center pr-2 pl-3">
                  {/* perforace mezi tělem a ústřižkem, s výseky nahoře a dole */}
                  <span aria-hidden className="absolute inset-y-2 left-0 w-0 border-l-[1.5px] border-dotted border-rule" />
                  <span aria-hidden className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-paper" />
                  <span aria-hidden className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-paper" />
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    disabled={busy === key}
                    onClick={async () => {
                      setError(undefined);
                      setBusy(key);
                      try {
                        await settle(debt);
                      } catch (e) {
                        setError(errorMessage(e));
                      } finally {
                        setBusy(undefined);
                      }
                    }}
                  >
                    {t("debt.settle")}
                  </Button>
                </div>
              )}
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>
      <p className="px-1 text-[0.8125rem] text-ink-3">{t("debt.simplified")}</p>

      <DebtSheet debt={open} onClose={() => setOpen(null)} {...ctx} />
    </div>
  );
}

/** Vysvětlení převodu: bilance celé party, ze kterých zjednodušené převody vycházejí. */
function DebtSheet({ debt, onClose, ...ctx }: Ctx & { debt: Debt | null; onClose: () => void }) {
  const balances = useQuery(api.settlements.balances, debt ? { groupId: ctx.groupId } : "skip");
  const { canAct, settle } = useDebtActions(ctx);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const memberOf = (id: string) => ctx.members.find((m) => m.userId === id);

  async function settleAndClose(debt: Debt) {
    setError(undefined);
    setBusy(true);
    try {
      await settle(debt);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={debt !== null}
      onClose={onClose}
      title={t("debt.detail")}
      footer={
        debt && canAct(debt) ? (
          <Button type="button" className="w-full" disabled={busy} onClick={() => void settleAndClose(debt)}>
            {t("debt.settleTransfer", { amount: formatShort(debt.amount, ctx.currency) })}
          </Button>
        ) : undefined
      }
    >
      {debt && (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink-2">{t("debt.detail.hint")}</p>
          <ErrorLine>{error}</ErrorLine>
          <div className="flex flex-col gap-2">
            <span className="field-label px-1">{t("debt.balances")}</span>
            <ul className="overflow-hidden rounded-slip border border-rule bg-sheet">
              {balances?.map((row) => {
                const involved = row.userId === debt.from || row.userId === debt.to;
                return (
                  <li
                    key={row.userId}
                    className={`flex min-h-13 items-center gap-3 border-b border-rule-soft px-4 py-2 last:border-b-0 ${involved ? "bg-form-soft/50" : ""}`}
                  >
                    <Avatar nickname={row.nickname} image={memberOf(row.userId)?.image} colorKey={row.color} isGuest={memberOf(row.userId)?.isGuest} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{row.nickname}</span>
                      <span className="block text-[0.8125rem] text-ink-3">
                        {row.balance > 0 ? t("debt.balance.plus") : row.balance < 0 ? t("debt.balance.minus") : t("debt.balance.zero")}
                      </span>
                    </span>
                    <span className={`font-mono tabular ${row.balance < 0 ? "text-owe" : row.balance > 0 ? "text-ink" : "text-ink-3"}`}>
                      {row.balance > 0 ? "+" : ""}
                      {formatShort(row.balance, ctx.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </Sheet>
  );
}
