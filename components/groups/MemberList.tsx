import { Avatar } from "@/components/ui/Avatar";
import { colorByKey } from "@/lib/colors";
import { t } from "@/lib/i18n";

/** Tvar odpovídá `members` z `api.groups.get` — viz convex/groups.ts. */
type Member = {
  userId: string;
  nickname: string;
  image?: string;
  color: string;
  role: "owner" | "member";
  joinedAt: number;
};

export function MemberList({ members }: { members: Member[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => (
        <li key={member.userId} className="flex items-center gap-3">
          <Avatar nickname={member.nickname} image={member.image} colorKey={member.color} />
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: colorByKey(member.color).hex }}
          />
          <span className="flex-1 font-medium">{member.nickname}</span>
          <span className="text-sm text-neutral-500">
            {member.role === "owner" ? t("group.role.owner") : t("group.role.member")}
          </span>
        </li>
      ))}
    </ul>
  );
}
