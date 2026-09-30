"use client";

/** Přepínač několika voleb v jedné liště (období, způsob dělení). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[6px] bg-rule-soft p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-9 flex-1 rounded-[4px] px-2 text-sm font-medium whitespace-nowrap transition-colors duration-100 ${
              active ? "bg-sheet text-ink shadow-[0_0_0_1px_var(--color-rule)]" : "text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
