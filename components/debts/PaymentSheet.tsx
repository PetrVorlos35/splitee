"use client";

import { ArrowRight } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
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

/** Jeden zaplacený převod nebo staré vyrovnání — položka z `api.settlements.listForGroup`. */
export type Payment = FunctionReturnType<typeof api.settlements.listForGroup>[number];

/** „Petr → Jana", z pohledu diváka „Poslal(a) jsi: Jana" / „Petr ti poslal(a)". */
export function paymentTitle(payment: Payment, viewerId: string) {
  if (payment.fromUserId === viewerId) return t("payment.youSent", { name: payment.toNickname });
  if (payment.toUserId === viewerId) return t("payment.sentYou", { name: payment.fromNickname });
  return t("payment.sent", { from: payment.fromNickname, to: payment.toNickname });
}

const whenFmt = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Detail zaplaceného dluhu z feedu výdajů, s možností platbu vrátit. */
export function PaymentSheet({
  payment,
  onClose,
  members,
  currency,
  viewerId,
}: {
  payment: Payment | null;
  onClose: () => void;
  members: Member[];
  currency: string;
  viewerId: Id<"users">;
}) {
  const unsettle = useMutation(api.settlements.unsettleSettlement);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const memberOf = (id: string) => members.find((m) => m.userId === id);

  // stejné pravidlo jako canActOn v convex/settlements.ts — strana platby, nebo je stranou host
  const canAct =
    payment !== null &&
    (payment.fromUserId === viewerId ||
      payment.toUserId === viewerId ||
      !!memberOf(payment.fromUserId)?.isGuest ||
      !!memberOf(payment.toUserId)?.isGuest);
  // převod uzavřený jiným převodem vrátit nejde (SETTLEMENT_CLOSED)
  const closedByOther = payment?.closedBy !== undefined && payment?.closedBy !== payment?._id;

  async function undo(payment: Payment) {
    setError(undefined);
    setBusy(true);
    try {
      await unsettle({ settlementId: payment._id });
      toast({ message: t("payment.undone") });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const from = payment ? memberOf(payment.fromUserId) : undefined;
  const to = payment ? memberOf(payment.toUserId) : undefined;

  return (
    <Sheet
      open={payment !== null}
      onClose={onClose}
      title={t("payment.title")}
      footer={
        payment && canAct && !closedByOther ? (
          <Button type="button" variant="danger" className="w-full" disabled={busy} onClick={() => void undo(payment)}>
            {t("payment.undo")}
          </Button>
        ) : undefined
      }
    >
      {payment && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-slip border border-rule bg-sheet px-4 py-4">
            <span className="flex shrink-0 items-center">
              <Avatar nickname={payment.fromNickname} image={from?.image} colorKey={from?.color ?? "red"} isGuest={from?.isGuest} size={36} />
              <ArrowRight size={16} className="mx-1 text-ink-3" />
              <Avatar nickname={payment.toNickname} image={to?.image} colorKey={to?.color ?? "red"} isGuest={to?.isGuest} size={36} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{paymentTitle(payment, viewerId)}</span>
              <span className="block font-mono text-xl font-medium tabular">{formatShort(payment.amount, currency)}</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-2">
            {t("payment.recorded", {
              when: whenFmt.format(payment.createdAt),
              name: memberOf(payment.createdBy)?.nickname ?? "Někdo",
            })}
          </p>
          {closedByOther && <p className="text-sm leading-relaxed text-ink-3">{t("payment.closed")}</p>}
          <ErrorLine>{error}</ErrorLine>
        </div>
      )}
    </Sheet>
  );
}
