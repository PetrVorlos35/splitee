import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /join/ schválně NENÍ zakázaný: crawlery náhledů (Messenger, WhatsApp…)
    // by jinak nenačetly OG obrázek pozvánky. Z indexu ho drží noindex.
    rules: { userAgent: "*", allow: "/", disallow: ["/g/", "/me", "/onboarding"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
