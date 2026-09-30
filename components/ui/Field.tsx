import type { ComponentProps, ReactNode } from "react";

/**
 * Pole tiskopisu: rámeček s drobným popiskem nahoře uvnitř, hodnota pod ním.
 * Klepnutí kamkoli do rámečku zaměří vstup (label obaluje celé pole).
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className={`flex flex-col gap-0.5 rounded-[6px] border bg-sheet px-3.5 pt-2 pb-2.5 transition-colors focus-within:border-form ${
          error ? "border-owe" : "border-rule"
        }`}
      >
        <span className="field-label">{label}</span>
        {children}
      </label>
      {hint && !error && <p className="px-1 text-[0.8125rem] text-ink-3">{hint}</p>}
      {error && (
        <p role="alert" className="px-1 text-[0.8125rem] text-owe">
          {error}
        </p>
      )}
    </div>
  );
}

/** Holý vstup do Field — bez vlastního rámečku, ten nese Field. */
export function FieldInput({ className = "", autoFocus, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-autofocus={autoFocus ? "" : undefined}
      autoFocus={autoFocus}
      className={`w-full bg-transparent text-[1.0625rem] text-ink outline-none placeholder:text-ink-3/70 ${className}`}
      {...props}
    />
  );
}

/** Popisek skupiny ovládacích prvků, které se do rámečku Field nevejdou (čipy, přepínače). */
export function GroupLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2 px-1">
      <span className="field-label">{children}</span>
      {action}
    </div>
  );
}

export function ErrorLine({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[6px] bg-owe-soft px-3.5 py-2.5 text-sm text-owe">
      {children}
    </p>
  );
}
