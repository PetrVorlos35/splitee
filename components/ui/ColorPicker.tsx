"use client";

import { Check } from "lucide-react";
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
  label,
}: {
  value: string;
  onChange: (key: string) => void;
  taken?: string[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-2.5">
      {MEMBER_COLORS.map((color) => {
        const isTaken = taken.includes(color.key) && color.key !== value;
        const isSelected = color.key === value;
        return (
          <button
            key={color.key}
            type="button"
            role="radio"
            aria-label={color.name}
            aria-checked={isSelected}
            disabled={isTaken}
            onClick={() => onChange(color.key)}
            className="flex aspect-square items-center justify-center rounded-full transition-transform duration-100 active:scale-90 disabled:opacity-25"
            style={{
              backgroundColor: color.hex,
              boxShadow: isSelected ? `0 0 0 2px var(--color-paper), 0 0 0 4px ${color.hex}` : undefined,
              color: color.textOn === "white" ? "#fff" : "#15181c",
            }}
          >
            {isSelected && <Check size={18} strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
