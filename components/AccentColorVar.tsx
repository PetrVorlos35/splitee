"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { colorByKey } from "@/lib/colors";

/**
 * Drží CSS proměnnou --accent na <body> podle viewer.accentColor. Mountuje
 * se jednou v ConvexClientProvider, ne na jednotlivé stránce — kdyby žila
 * jen na /me, proměnná by po natvrdo načtené jiné route chyběla, protože
 * mount na /me by nikdy neproběhl.
 */
export function AccentColorVar() {
  const viewer = useQuery(api.users.viewer);

  useEffect(() => {
    if (viewer?.accentColor) {
      document.body.style.setProperty("--accent", colorByKey(viewer.accentColor).hex);
    }
  }, [viewer?.accentColor]);

  return null;
}
