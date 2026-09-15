"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { t } from "@/lib/i18n";

function hasKnownCode(e: unknown): boolean {
  return (
    e !== null &&
    typeof e === "object" &&
    "data" in e &&
    (e as { data?: unknown }).data !== null &&
    typeof (e as { data?: unknown }).data === "object" &&
    "code" in (e as { data: object }).data
  );
}

/**
 * Error boundary pro /g/[groupId] a všechno pod ním (settings, budoucí
 * dashboard z Tasku 6+). `api.groups.get` je první throwing query za
 * user-reachable dynamickou route v appce — bez tohohle souboru by Next.js
 * ukázal holou "Application error" stránku místo srozumitelné hlášky.
 *
 * Chytá tři případy:
 *  - requireMembership spadne s NOT_MEMBER (cizí URL party, ze které tě
 *    někdo vyhodil, apod.)
 *  - groups.get spadne s GROUP_NOT_FOUND (parta smazaná, ale členství na ni
 *    ještě ukazuje)
 *  - `groupId as Id<"groups">` v layout.tsx je ve skutečnosti cokoli
 *    (/g/garbage) — Convexův validátor `v.id("groups")` to odmítne dřív, než
 *    se dostane k requireMembership, a tahle chyba žádný `.data.code`
 *    nenese, proto padá na obecnou hlášku, ne na formulářové
 *    "Nepovedlo se uložit." z errorMessage()'s fallbacku.
 */
export default function GroupError({ error }: { error: Error & { digest?: string } }) {
  const message = hasKnownCode(error) ? errorMessage(error) : t("error.groupUnavailable");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-lg font-medium">{message}</p>
      <Link href="/">
        <Button type="button">{t("nav.home")}</Button>
      </Link>
    </main>
  );
}
