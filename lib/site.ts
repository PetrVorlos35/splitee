// Veřejná adresa appky — z ní se skládají absolutní URL pro OG obrázky,
// canonical a sitemap. Sociální sítě relativní og:image neberou. Na Vercelu
// ji dodá VERCEL_PROJECT_PRODUCTION_URL (produkční doména, i v preview).
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (
  process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : "https://splitee.vorlos.eu")
).replace(/\/$/, "");

export const SEO_DESCRIPTION =
  "Zapiš útratu za pár vteřin, Splitee ji rozpočítá a ukáže, kdo komu kolik dluží. Na výlet, chatu, festival i spolubydlení. Zdarma, bez instalace.";

export const SEO_KEYWORDS = [
  "rozdělení výdajů",
  "společné výdaje",
  "kdo komu dluží",
  "dělení účtu",
  "výdaje na výlet",
  "výdaje na chatě",
  "spolubydlení nájem",
  "vyrovnání dluhů",
  "Splitwise alternativa",
  "Splitee",
];

// Next metadata se mezi layoutem a stránkou slévá jen do hloubky jedné
// úrovně — stránka, která nastaví vlastní `openGraph`, musí tohle rozbalit,
// jinak přijde o siteName a locale.
export const OPEN_GRAPH_BASE = {
  siteName: "Splitee",
  locale: "cs_CZ",
  type: "website",
} as const;
