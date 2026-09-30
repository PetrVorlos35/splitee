"use client";

import { Copy, Link2, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DigitBoxes } from "@/components/ui/DigitBoxes";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/lib/i18n";

/**
 * Odkaz na pozvánku — VŽDY cesta `/join/<kód>`, nikdy `?code=` query.
 * Convex Auth middleware vyměňuje libovolný `?code=` na same-origin
 * navigaci za token a při neúspěchu smaže přihlašovací cookie — viz
 * middleware.ts. Proto se kód lepí jen do cesty.
 */
export function inviteLink(code: string) {
  return typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;
}

/** QR kód pozvánky, na ukázání přes stůl. */
export function InviteQrSheet({ open, onClose, code }: { open: boolean; onClose: () => void; code: string }) {
  const [qr, setQr] = useState<string>();
  const link = inviteLink(code);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#15181c", light: "#ffffff" } }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, link]);

  return (
    <Sheet open={open} onClose={onClose} title={t("group.invite.title")}>
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="rounded-slip border border-rule bg-sheet p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={link} width={240} height={240} className="size-60" />
          ) : (
            <div className="size-60" />
          )}
        </div>
        <p className="font-mono text-2xl font-medium tracking-[0.3em]">{code}</p>
        <p className="max-w-xs text-center text-sm text-ink-2">{t("group.invite.hint")}</p>
      </div>
    </Sheet>
  );
}

/**
 * Sdílení pozvánky: na telefonu systémový share sheet, jinde (nebo když ho
 * uživatel zavře bez sdílení a prohlížeč share nepodporuje) kopie do schránky.
 */
export async function shareInvite(code: string, groupName: string, onCopied: () => void) {
  const url = inviteLink(code);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Splitee", text: t("group.invite.shareText", { name: groupName }), url });
      return;
    } catch (e) {
      // AbortError = uživatel share sheet zavřel, nic dalšího nedělat
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  await navigator.clipboard.writeText(url);
  onCopied();
}

/**
 * Pozvánka pro zakladatele: kód (klepnutím se zkopíruje — dá se poslat do
 * skupinového chatu a lidi ho jen zadají v „Připojit se kódem"), sdílení
 * odkazu, kopie odkazu a QR. Stejný blok v nastavení party i v archu Pozvat.
 */
export function InvitePanel({ code, groupName }: { code: string; groupName: string }) {
  const toast = useToast();
  const [qrOpen, setQrOpen] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    toast({ message: t("group.invite.codeCopied") });
  }

  return (
    <div className="overflow-hidden rounded-slip bg-sheet shadow-slip">
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3.5">
        <span className="field-label">{t("group.code.label")}</span>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void copyCode()}
            aria-label={t("group.invite.copyCode")}
            className="-m-1 rounded-[4px] p-1 active:bg-form-soft"
          >
            <DigitBoxes value={code} size="md" />
          </button>
          <Button type="button" variant="secondary" size="sm" onClick={() => void copyCode()}>
            <Copy size={15} />
            {t("group.invite.copyCodeShort")}
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{t("group.invite.hint")}</p>
      </div>
      <div className="perforation" />
      <div className="grid grid-cols-3 gap-2 p-3">
        <Button
          type="button"
          size="md"
          className="col-span-3"
          onClick={() => void shareInvite(code, groupName, () => toast({ message: t("group.invite.copied") }))}
        >
          <Share2 size={17} />
          {t("group.invite.share")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="col-span-2"
          onClick={async () => {
            await navigator.clipboard.writeText(inviteLink(code));
            toast({ message: t("group.invite.copied") });
          }}
        >
          <Link2 size={16} />
          {t("group.invite.copy")}
        </Button>
        <Button type="button" variant="secondary" size="md" aria-label={t("group.invite.qr")} onClick={() => setQrOpen(true)}>
          <QrCode size={18} />
        </Button>
      </div>
      <InviteQrSheet open={qrOpen} onClose={() => setQrOpen(false)} code={code} />
    </div>
  );
}

/** Arch „Pozvat" z hlavní stránky party. */
export function InviteSheet({
  open,
  onClose,
  code,
  groupName,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  groupName: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t("group.invite.title")}>
      <InvitePanel code={code} groupName={groupName} />
    </Sheet>
  );
}
