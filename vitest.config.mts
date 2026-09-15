import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
          // bez tohoto řádku convex-test spadne na import.meta.glob
          server: { deps: { inline: ["convex-test"] } },
        },
      },
      {
        extends: true,
        test: {
          name: "pwa",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "lib",
          include: ["lib/**/*.test.ts"],
          exclude: ["convex/**", "node_modules/**"],
          environment: "node",
        },
      },
    ],
  },
});
