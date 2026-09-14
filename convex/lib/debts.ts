export type RawDebt = { debtorId: string; creditorId: string; amount: number };
export type Debt = { from: string; to: string; amount: number };

export function aggregateDebts(unsettled: RawDebt[]): Debt[] {
  const pairs = new Map<string, number>();
  for (const { debtorId, creditorId, amount } of unsettled) {
    if (debtorId === creditorId) continue; // podíl plátce, nikdo nikomu nedluží
    const key = `${debtorId}>${creditorId}`;
    pairs.set(key, (pairs.get(key) ?? 0) + amount);
  }

  const netted: Debt[] = [];
  const handled = new Set<string>();
  for (const [key, amount] of pairs) {
    if (handled.has(key)) continue;
    const [from, to] = key.split(">");
    const reverseKey = `${to}>${from}`;
    handled.add(key);
    handled.add(reverseKey);

    const net = amount - (pairs.get(reverseKey) ?? 0);
    if (net > 0) netted.push({ from, to, amount: net });
    else if (net < 0) netted.push({ from: to, to: from, amount: -net });
    // net === 0 → dvojice je vyrovnaná, do UI nepatří
  }

  return netted.sort((a, b) => b.amount - a.amount);
}
