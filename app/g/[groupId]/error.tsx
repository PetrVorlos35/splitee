"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { errorMessage, hasTranslatedCode } from "@/lib/errors";
import { t } from "@/lib/i18n";

/**
 * Error boundary pro /g/[groupId] a všechno pod ním. Chytá NOT_MEMBER (cizí
 * URL party), GROUP_NOT_FOUND a nesmyslné id v URL — to poslední nenese
 * přeložitelný kód, proto padá na obecnou hlášku (`hasTranslatedCode`).
 *
 * Tlačítko domů je `<button onClick>`, ne `<Link><Button></Link>` —
 * vnořený `<a><button></a>` je neplatné HTML.
 */
export default function GroupError({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();
  const message = hasTranslatedCode(error) ? errorMessage(error) : t("error.groupUnavailable");

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-lg font-medium text-balance">{message}</p>
      <Button type="button" onClick={() => router.push("/")}>
        {t("nav.home")}
      </Button>
    </main>
  );
}
