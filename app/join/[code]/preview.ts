import { fetchQuery } from "convex/nextjs";
import { cache } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Náhled party pro metadata a OG obrázek pozvánky (na serveru, bez
 * přihlášení). Když Convex neodpoví, vrátí null a použije se obecný náhled —
 * rozbitý náhled v chatu nesmí shodit samotnou stránku.
 */
export const invitePreview = cache(async (code: string) => {
  try {
    return await fetchQuery(api.groups.previewByCode, { code });
  } catch {
    return null;
  }
});
