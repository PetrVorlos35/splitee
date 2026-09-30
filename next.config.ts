import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // v domovské složce leží cizí package-lock.json — bez tohohle si Next
  // odvodí kořen workspace o úroveň výš a Tailwind pak neprochází zdrojáky
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
