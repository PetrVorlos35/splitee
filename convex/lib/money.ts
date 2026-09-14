/** „340,50" i „1 234.5" → haléře. Vstup z formuláře je vždy text. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[\s\u00A0]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error("Zadej částku jako číslo, například 340,50.");
  }
  const haleru = Math.round(Number(cleaned) * 100);
  if (!Number.isInteger(haleru) || haleru <= 0) {
    throw new Error("Částka musí být větší než nula.");
  }
  return haleru;
}

/** Haléře → „340,50 Kč". Jediné místo, kde se z integeru stává text. */
export function formatAmount(haleru: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(haleru / 100);
}
