import type { Id } from "@/convex/_generated/dataModel";
import { GroupHeader } from "@/components/groups/GroupHeader";

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
      <GroupHeader groupId={groupId as Id<"groups">} />
      {children}
    </div>
  );
}
