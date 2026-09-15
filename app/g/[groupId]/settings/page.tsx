"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { InviteSheet } from "@/components/groups/InviteSheet";
import { MemberList } from "@/components/groups/MemberList";
import { t } from "@/lib/i18n";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useQuery(api.groups.get, { groupId: groupId as Id<"groups"> });
  const [inviteOpen, setInviteOpen] = useState(false);

  if (group === undefined) return <p className="p-6">{t("auth.loading")}</p>;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("group.settings.title")}</h1>

      <Button type="button" onClick={() => setInviteOpen(true)}>
        {t("group.invite.title")}
      </Button>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-neutral-500">{t("group.settings.members")}</h2>
        <MemberList members={group.members} />
      </section>

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} code={group.inviteCode} />
    </main>
  );
}
