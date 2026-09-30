"use client";

import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { AddGuestSheet, EditGuestSheet } from "@/components/groups/GuestSheets";
import { InvitePanel } from "@/components/groups/InviteSheet";
import type { Member } from "@/components/groups/types";
import { t } from "@/lib/i18n";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const gid = groupId as Id<"groups">;
  const group = useQuery(api.groups.get, { groupId: gid });
  const viewer = useQuery(api.users.viewer);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  if (group === undefined || viewer === undefined) {
    return <main className="mx-auto max-w-lg px-4 pt-4"><div className="h-40 animate-pulse rounded-slip bg-sheet/70" /></main>;
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-7 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1">
        <Link
          href={`/g/${gid}`}
          className="-ml-2 flex h-11 items-center gap-1 rounded-[6px] pr-3 pl-1 text-[0.9375rem] font-medium text-form active:bg-form-soft"
        >
          <ChevronLeft size={20} />
          {t("common.back")}
        </Link>
      </div>
      <h1 className="-mt-4 px-1 text-2xl font-semibold tracking-[-0.02em]">{t("group.settings.title")}</h1>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[0.9375rem] font-semibold tracking-[-0.005em]">{t("group.settings.invite")}</h2>
        <InvitePanel code={group.inviteCode} groupName={group.name} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[0.9375rem] font-semibold tracking-[-0.005em]">{t("group.settings.members")}</h2>
        <ul className="overflow-hidden rounded-slip bg-sheet shadow-slip">
          {group.members.map((m) => {
            const isMe = m.userId === viewer?._id;
            const row = (
              <>
                <Avatar nickname={m.nickname} image={m.image} colorKey={m.color} isGuest={m.isGuest} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {m.nickname}
                    {isMe && <span className="font-normal text-ink-3"> · {t("common.you")}</span>}
                  </span>
                  {(m.isGuest || m.role === "owner") && (
                    <span className="block text-[0.8125rem] text-ink-3">
                      {m.isGuest ? t("group.role.guest") : t("group.role.owner")}
                    </span>
                  )}
                </span>
              </>
            );
            return (
              <li key={m.userId} className="border-b border-rule-soft last:border-b-0">
                {m.isGuest ? (
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="flex min-h-15 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-paper"
                  >
                    {row}
                    <ChevronRight size={18} className="text-ink-3" />
                  </button>
                ) : (
                  <div className="flex min-h-15 items-center gap-3 px-4 py-2.5">{row}</div>
                )}
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium text-form active:bg-paper"
            >
              <UserPlus size={20} />
              {t("guest.add")}
            </button>
          </li>
        </ul>
      </section>

      <AddGuestSheet open={addOpen} onClose={() => setAddOpen(false)} groupId={gid} />
      <EditGuestSheet guest={editing} onClose={() => setEditing(null)} groupId={gid} />
    </main>
  );
}
