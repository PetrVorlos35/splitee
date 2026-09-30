import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Splitee",
  description: "Výdaje v partě bez dohadování",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Splitee", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
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
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <RegisterServiceWorker />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
