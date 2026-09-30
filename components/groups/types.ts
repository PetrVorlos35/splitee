/** Tvar odpovídá `members` z `api.groups.get` — viz convex/members.ts. */
export type Member = {
  userId: string;
  nickname: string;
  image?: string;
  color: string;
  role: "owner" | "member";
  joinedAt: number;
  isGuest: boolean;
};
