"use client";

import { Check, ChevronDown, KeyRound, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Sheet } from "@/components/ui/Sheet";
import { CreateGroupSheet, JoinByCodeSheet } from "@/components/groups/GroupSheets";
import { people, t } from "@/lib/i18n";

/** Přepínač party v hlavičce — otevře arch se všemi partami, kde jsem. */
export function GroupSwitcher({ currentGroupId }: { currentGroupId: Id<"groups"> }) {
  const router = useRouter();
  const groups = useQuery(api.groups.listMine);
  const [listOpen, setListOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const current = groups?.find((g) => g._id === currentGroupId);

  return (
    <>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        aria-haspopup="dialog"
        className="-ml-2 flex h-11 min-w-0 items-center gap-2 rounded-[6px] px-2 text-left active:bg-rule-soft"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-rule bg-sheet text-lg">
          {current?.emoji ?? ""}
        </span>
        <span className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em]">{current?.name ?? ""}</span>
        <ChevronDown size={18} className="shrink-0 text-ink-3" />
      </button>

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title={t("group.switcher.title")}>
        <ul className="flex flex-col overflow-hidden rounded-slip border border-rule bg-sheet">
          {groups?.map((g) => {
            const active = g._id === currentGroupId;
            return (
              <li key={g._id} className="border-b border-rule-soft last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    setListOpen(false);
                    if (!active) router.push(`/g/${g._id}`);
                  }}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-paper"
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.name}</span>
                    <span className="block text-[0.8125rem] text-ink-3">
                      {t("group.switcher.members", { people: people(g.memberCount) })}
                    </span>
                  </span>
                  {active && <Check size={18} className="text-form" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setListOpen(false);
              setCreateOpen(true);
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-[6px] border border-rule bg-sheet font-medium active:bg-paper"
          >
            <Plus size={18} className="text-form" />
            {t("group.switcher.newGroup")}
          </button>
          <button
            type="button"
            onClick={() => {
              setListOpen(false);
              setJoinOpen(true);
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-[6px] border border-rule bg-sheet font-medium active:bg-paper"
          >
            <KeyRound size={18} className="text-form" />
            {t("group.join")}
          </button>
        </div>
      </Sheet>

      <CreateGroupSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(groupId) => {
          setCreateOpen(false);
          router.push(`/g/${groupId}`);
        }}
      />
      <JoinByCodeSheet open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}
