import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // v domovské složce leží cizí package-lock.json — bez tohohle si Next
  // odvodí kořen workspace o úroveň výš a Tailwind pak neprochází zdrojáky
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
  // fonty pro OG obrázky se čtou z disku (lib/og.tsx), tracer je sám nenajde
  outputFileTracingIncludes: { "/**/opengraph-image*": ["./assets/fonts/*"] },
};

export default nextConfig;
