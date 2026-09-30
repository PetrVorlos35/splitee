import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { OPEN_GRAPH_BASE, SEO_DESCRIPTION, SEO_KEYWORDS, SITE_URL } from "@/lib/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-geist-mono" });

const TITLE = "Splitee — výdaje v partě bez dohadování";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Splitee" },
  description: SEO_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  applicationName: "Splitee",
  category: "finance",
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH_BASE, title: TITLE, description: SEO_DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: SEO_DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Splitee", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
};

// strukturovaná data pro Google — appka jako webová aplikace zdarma
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Splitee",
  url: SITE_URL,
  description: SEO_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  inLanguage: "cs",
  image: `${SITE_URL}/opengraph-image`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "CZK" },
};

export const viewport: Viewport = {
  themeColor: "#F3F6F8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // kvůli bezpečným zónám na iPhonu s výřezem
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="cs" className={`${geist.variable} ${geistMono.variable}`}>
        <body className="min-h-dvh font-sans antialiased">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <RegisterServiceWorker />
          <Analytics />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
