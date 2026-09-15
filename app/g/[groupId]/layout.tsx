import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { GroupSwitcher } from "@/components/groups/GroupSwitcher";
import { t } from "@/lib/i18n";

export default async function GroupLayout({
  params,
  children,
}: {
  params: Promise<{ groupId: string }>;
  children: React.ReactNode;
}) {
  const { groupId } = await params;

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-4 border-b border-neutral-100 p-4">
        <GroupSwitcher currentGroupId={groupId as Id<"groups">} />
        <Link href="/me" className="text-sm font-medium underline">
          {t("nav.profile")}
        </Link>
      </header>
      {children}
    </div>
  );
}
