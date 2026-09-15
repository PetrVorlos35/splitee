"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MemberList } from "@/components/groups/MemberList";
import { t } from "@/lib/i18n";

/**
 * Zatím jen holé rozcestí party — koláč, výdaje a dluhy staví Task 6–11 na
 * tomhle místě. Tahle stránka existuje jen proto, aby přesměrování z
 * app/page.tsx mělo kam dojít.
 */
export default function GroupHomePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useQuery(api.groups.get, { groupId: groupId as Id<"groups"> });

  if (group === undefined) return <p className="p-6">{t("auth.loading")}</p>;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 p-6">
      <div>
        <p className="text-4xl">{group.emoji}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
      </div>

      <MemberList members={group.members} />

      <Link href={`/g/${group._id}/settings`} className="text-sm font-medium underline">
        {t("group.settings.title")}
      </Link>
    </main>
  );
}
