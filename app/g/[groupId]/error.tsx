"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { errorMessage, hasTranslatedCode } from "@/lib/errors";
import { t } from "@/lib/i18n";

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
 *    se dostane k requireMembership, a tahle chyba žádný přeložitelný kód
 *    nenese, proto padá na obecnou hlášku, ne na formulářové
 *    "Nepovedlo se uložit." z errorMessage()'s fallbacku. `hasTranslatedCode`
 *    ověřuje členství v `MESSAGE_KEY`, ne jen to, že `data.code` existuje —
 *    jinak by i neznámý kód beze překladu skončil na stejné obecné hlášce.
 *
 * Tlačítko domů je `<button onClick>`, ne `<Link><Button></Link>` —
 * vnořený `<a><button></a>` je neplatné HTML a čtečka obrazovky by
 * oznámila dva vnořené ovládací prvky.
 */
export default function GroupError({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();
  const message = hasTranslatedCode(error) ? errorMessage(error) : t("error.groupUnavailable");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-lg font-medium">{message}</p>
      <Button type="button" onClick={() => router.push("/")}>
        {t("nav.home")}
      </Button>
    </main>
  );
}
