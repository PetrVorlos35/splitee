"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { t } from "@/lib/i18n";

/**
 * Odkaz na pozvánku — VŽDY cesta `/join/<kód>`, nikdy `?code=` query.
 * Convex Auth middleware vyměňuje libovolný `?code=` na same-origin
 * navigaci za token a při neúspěchu smaže přihlašovací cookie — viz
 * middleware.ts. Proto se kód lepí jen do cesty.
 */
export function InviteSheet({
  open,
  onClose,
  code,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
}) {
  const [qr, setQr] = useState<string>();
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 256 }).then((dataUrl) => {
      if (!cancelled) setQr(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [open, link]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("group.invite.title")}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-4xl font-bold tracking-[0.3em]">{code}</p>
        <p className="text-center text-sm text-neutral-500">{t("group.invite.hint")}</p>

        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={link} width={200} height={200} className="rounded-2xl" />
        )}

        <Button type="button" onClick={() => void copyLink()} className="w-full">
          {copied ? t("group.invite.copied") : t("group.invite.copy")}
        </Button>
      </div>
    </Sheet>
  );
}
