/**
 * Částka vepsaná do políček jako na poštovní poukázce: každá číslice má svůj
 * rámeček, oddělovače (mezera, čárka, znaménko) stojí volně mezi nimi.
 */
export function DigitBoxes({ value, size = "lg" }: { value: string; size?: "lg" | "md" }) {
  const box = size === "lg" ? "h-12 w-[2.125rem] text-[1.75rem]" : "h-9 w-[1.625rem] text-xl";
  return (
    <span className={`inline-flex items-end font-mono font-medium tabular text-ink`} aria-label={value}>
      {Array.from(value).map((ch, i) =>
        /[0-9A-Z]/.test(ch) ? (
          <span
            key={i}
            aria-hidden
            className={`-ml-px inline-flex items-center justify-center border border-rule bg-sheet first:ml-0 ${box}`}
          >
            {ch}
          </span>
        ) : (
          <span key={i} aria-hidden className={`inline-flex items-center justify-center px-[3px] ${size === "lg" ? "h-12 text-[1.75rem]" : "h-9 text-xl"}`}>
            {ch === " " || ch === " " ? "" : ch}
          </span>
        ),
      )}
    </span>
  );
}
