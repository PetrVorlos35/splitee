export type RawDebt = { debtorId: string; creditorId: string; amount: number };
export type Debt = { from: string; to: string; amount: number };

/**
 * Čistá bilance každého člověka v haléřích: kladná = má dostat, záporná =
 * má zaplatit. Plátcův vlastní podíl (dlužník = věřitel) nic nemění. Lidi
 * na nule ve výsledku nejsou. Součet všech bilancí je vždy 0.
 */
export function netBalances(debts: RawDebt[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const { debtorId, creditorId, amount } of debts) {
    if (debtorId === creditorId) continue;
    balances.set(creditorId, (balances.get(creditorId) ?? 0) + amount);
    balances.set(debtorId, (balances.get(debtorId) ?? 0) - amount);
  }
  for (const [id, balance] of balances) if (balance === 0) balances.delete(id);
  return balances;
}

type Side = { id: string; amount: number };

// větší částka první, při shodě podle id — stejný vstup dá vždy stejné
// převody, aby seznam v UI mezi překresleními neposkakoval
const byAmountDesc = (a: Side, b: Side) => b.amount - a.amount || a.id.localeCompare(b.id);

/**
 * Z bilancí udělá co nejmíň převodů „kdo komu pošle kolik", aby byli všichni
 * na nule — nezáleží na tom, kdo komu původně dlužil (Petr tak může poslat
 * peníze rovnou Janě, i když spolu nikdy nic neplatili).
 *
 * Nejdřív spáruje dvojice, kde dluh a pohledávka sedí přesně (jeden převod
 * vyřeší dva lidi naráz), zbytek hladově: největší dlužník platí největšímu
 * věřiteli. Výsledek má nejvýš „počet lidí s nenulovou bilancí − 1" převodů
 * a sedí na haléř. Úplné minimum je NP-těžké; pro partu do deseti lidí je
 * rozdíl proti hladovému postupu zanedbatelný.
 */
export function simplifyDebts(balances: Map<string, number>): Debt[] {
  let debtors: Side[] = [];
  let creditors: Side[] = [];
  for (const [id, balance] of balances) {
    if (balance < 0) debtors.push({ id, amount: -balance });
    else if (balance > 0) creditors.push({ id, amount: balance });
  }
  debtors.sort(byAmountDesc);
  creditors.sort(byAmountDesc);

  const transfers: Debt[] = [];

  for (const debtor of debtors) {
    const match = creditors.find((c) => c.amount === debtor.amount);
    if (!match) continue;
    transfers.push({ from: debtor.id, to: match.id, amount: debtor.amount });
    debtor.amount = 0;
    match.amount = 0;
    creditors = creditors.filter((c) => c.amount > 0);
  }
  debtors = debtors.filter((d) => d.amount > 0);

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({ from: debtor.id, to: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    debtors = debtors.filter((d) => d.amount > 0).sort(byAmountDesc);
    creditors = creditors.filter((c) => c.amount > 0).sort(byAmountDesc);
  }

  return transfers.sort((a, b) => b.amount - a.amount || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}
