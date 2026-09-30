"use client";

import { Settings } from "lucide-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { GroupSwitcher } from "@/components/groups/GroupSwitcher";
import { t } from "@/lib/i18n";

/** Horní lišta party: přepínač party vlevo, nastavení party a profil vpravo. */
export function GroupHeader({ groupId }: { groupId: Id<"groups"> }) {
  const viewer = useQuery(api.users.viewer);
  const group = useQuery(api.groups.get, { groupId });
  const me = group?.members.find((m) => m.userId === viewer?._id);

  return (
    <header className="sticky top-0 z-30 border-b border-rule/70 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-1 px-4">
        <div className="min-w-0 flex-1">
          <GroupSwitcher currentGroupId={groupId} />
        </div>
        <Link
          href={`/g/${groupId}/settings`}
          aria-label={t("nav.settings")}
          className="flex size-11 items-center justify-center rounded-full text-ink-2 active:bg-rule-soft"
        >
          <Settings size={21} strokeWidth={1.9} />
        </Link>
        <Link
          href="/me"
          aria-label={t("nav.profile")}
          className="-mr-1.5 flex size-11 items-center justify-center rounded-full active:bg-rule-soft"
        >
          {me && viewer ? (
            <Avatar nickname={me.nickname} image={viewer.image} colorKey={me.color} size={30} />
          ) : (
            <span className="size-[30px] rounded-full bg-rule-soft" />
          )}
        </Link>
      </div>
    </header>
  );
}
