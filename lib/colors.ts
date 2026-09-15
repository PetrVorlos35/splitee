import { ConvexError } from "convex/values";
import { ERROR } from "./errors";

export const MEMBER_COLORS = [
  { key: "red", name: "Červená", hex: "#F25A5A", textOn: "black" },
  { key: "orange", name: "Oranžová", hex: "#CE8339", textOn: "black" },
  { key: "mustard", name: "Hořčicová", hex: "#999926", textOn: "black" },
  { key: "olive", name: "Olivová", hex: "#67A529", textOn: "black" },
  { key: "green", name: "Zelená", hex: "#2BAB2B", textOn: "black" },
  { key: "emerald", name: "Smaragdová", hex: "#2AA96A", textOn: "black" },
  { key: "teal", name: "Tyrkysová", hex: "#29A3A3", textOn: "black" },
  { key: "cyan", name: "Azurová", hex: "#5099E2", textOn: "black" },
  { key: "blue", name: "Modrá", hex: "#5A5AF2", textOn: "white" },
  { key: "indigo", name: "Indigová", hex: "#A65AF2", textOn: "black" },
  { key: "violet", name: "Fialová", hex: "#DF62DF", textOn: "black" },
  { key: "purple", name: "Purpurová", hex: "#F25AA6", textOn: "black" },
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

export function colorByKey(key: string): MemberColor {
  const found = MEMBER_COLORS.find((c) => c.key === key);
  // ConvexError, ne obyčejný Error — tahle funkce se volá i z Convex mutací
  // (přes firstFreeColor v convex/groups.ts), kde by produkce zprávu
  // obyčejného Error zredagovala na anglické "Server Error".
  if (!found) throw new ConvexError({ code: ERROR.UNKNOWN_COLOR });
  return found;
}

/** Barvy se v partě nesmí opakovat — jsou to identity, ne dekorace. */
export function firstFreeColor(taken: string[]): string {
  const free = MEMBER_COLORS.find((c) => !taken.includes(c.key));
  // Nedosažitelné z convex/groups.ts, dokud MAX_MEMBERS (10) < počet barev
  // (12) — přesto ConvexError, ne past pro dalšího volajícího.
  if (!free) throw new ConvexError({ code: ERROR.COLORS_EXHAUSTED });
  return free.key;
}
