import { formatAmount } from "@/convex/lib/money";

export { formatAmount };

/** Haléře → „1 250,50" bez měny a bez nulových haléřů („1 250"). Pro políčka a kompaktní řádky. */
export function formatPlain(haleru: number): string {
  const abs = Math.abs(haleru);
  const whole = abs % 100 === 0;
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(abs / 100);
}

/** Symbol měny v češtině („Kč"), aby šel psát vedle políček. */
export function currencySymbol(currency: string): string {
  const part = new Intl.NumberFormat("cs-CZ", { style: "currency", currency })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

/** Kompaktní částka s měnou, bez zbytečných „,00" — pro řádky seznamů. */
export function formatShort(haleru: number, currency: string): string {
  return `${haleru < 0 ? "−" : ""}${formatPlain(haleru)} ${currencySymbol(currency)}`;
}

const dayFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "long" });
const dayYearFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nadpis dne ve feedu: „Dnes", „Včera", „12. září", u jiného roku i s rokem. */
export function dayLabel(ms: number, now: number, today: string, yesterday: string): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  if (diff === 0) return today;
  if (diff === 1) return yesterday;
  return new Date(ms).getFullYear() === new Date(now).getFullYear() ? dayFmt.format(ms) : dayYearFmt.format(ms);
}

export function dayKey(ms: number): number {
  return startOfDay(ms);
}
