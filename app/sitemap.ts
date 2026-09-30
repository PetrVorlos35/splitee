import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// veřejná je jen úvodní stránka, všechno ostatní je za přihlášením
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
}
