const cs: Record<string, string> = {
  "app.name": "Splitee",
  "app.tagline": "Výdaje v partě bez dohadování",

  "auth.signIn": "Přihlásit se Googlem",
  "auth.signOut": "Odhlásit se",
  "auth.signedInAs": "Přihlášen jako {name}",
  "auth.loading": "Načítám…",

  "onboarding.nickname.label": "Jak ti mají ostatní říkat?",
  "onboarding.nickname.placeholder": "Přezdívka",
  "onboarding.color.label": "Tvoje barva",
  "onboarding.color.hint": "Podle ní tě parta pozná v grafu i ve výdajích.",

  "group.create": "Založit partu",
  "group.join": "Připojit se kódem",
  "group.code.label": "Kód party",
  "group.full": "Parta je plná, víc než deset lidí to neutáhne.",

  "expense.add": "Přidat výdaj",
  "expense.title.label": "Za co",
  "expense.amount.label": "Kolik",
  "expense.payer.label": "Kdo platil",
  "expense.participants.label": "Kdo se skládá",
  "expense.settled": "Zaplaceno",
  "expense.unsettled": "Nezaplaceno",

  "split.equal": "Rovným dílem",
  "split.exact": "Přesné částky",
  "split.shares": "Podíly",
  "split.mismatch": "Součet podílů nesedí na částku výdaje.",

  "donut.all": "Vše",
  "donut.me": "Já",
  "donut.others": "Ostatní",
  "donut.total": "Celkem utraceno",

  "period.thisMonth": "Tento měsíc",
  "period.lastMonth": "Minulý měsíc",
  "period.all": "Vše",

  "debt.owesYou": "{name} ti dluží",
  "debt.youOwe": "Dlužíš {name}",
  "debt.settle": "Vyrovnat",
  "debt.settleAll": "Vyrovnat vše s {name}",
  "debt.none": "Nikdo nikomu nic nedluží.",
};

/** `t("debt.owesYou", { name: "Petr" })` → „Petr ti dluží" */
export function t(key: string, vars?: Record<string, string | number>): string {
  const template = cs[key];
  if (template === undefined) throw new Error(`Chybí překlad pro klíč: ${key}`);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
