"use client";

import { motion } from "motion/react";
import { MEMBER_COLORS } from "@/lib/colors";

/**
 * `value`, `onChange` a `taken` pracují s klíči barev (např. "blue"), ne s
 * hexy — accentColor i memberships.color se v Convexu ukládá jako klíč.
 * Hex se použije jen tady, na vykreslení vzorku.
 */
export function ColorPicker({
  value,
  onChange,
  taken = [],
}: {
  value: string;
  onChange: (key: string) => void;
  taken?: string[];
}) {
  return (
    <div className="grid grid-cols-6 gap-3">
      {MEMBER_COLORS.map((color) => {
        const isTaken = taken.includes(color.key) && color.key !== value;
        const isSelected = color.key === value;
        return (
          <motion.button
            key={color.key}
            type="button"
            aria-label={color.name}
            aria-pressed={isSelected}
            disabled={isTaken}
            onClick={() => onChange(color.key)}
            whileTap={isTaken ? undefined : { scale: 0.9 }}
            animate={{ scale: isSelected ? 1.15 : 1, opacity: isTaken ? 0.25 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="aspect-square rounded-full ring-offset-2 disabled:cursor-not-allowed"
            style={{
              backgroundColor: color.hex,
              boxShadow: isSelected ? "0 0 0 3px #000" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
