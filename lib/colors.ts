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
  if (!found) throw new Error(`Neznámá barva člena: ${key}`);
  return found;
}

/** Barvy se v partě nesmí opakovat — jsou to identity, ne dekorace. */
export function firstFreeColor(taken: string[]): string {
  const free = MEMBER_COLORS.find((c) => !taken.includes(c.key));
  if (!free) throw new Error("Všech dvanáct barev je obsazených.");
  return free.key;
}
