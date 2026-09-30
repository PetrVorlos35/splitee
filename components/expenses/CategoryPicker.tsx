"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";

export function CategoryPicker({
  categories,
  value,
  onChange,
  label,
}: {
  categories: Doc<"categories">[];
  value: string;
  onChange: (categoryId: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {categories.map((category) => {
        const isSelected = category._id === value;
        return (
          <button
            key={category._id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(category._id)}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-[4px] border pr-3.5 pl-2.5 text-sm font-medium transition-colors duration-100 ${
              isSelected ? "border-form bg-form-soft text-form-deep" : "border-rule bg-sheet text-ink"
            }`}
          >
            <span className={isSelected ? "text-form" : "text-ink-3"}>
              <CategoryIcon name={category.name} size={16} />
            </span>
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
