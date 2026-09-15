const cs: Record<string, string> = {
  "app.name": "Splitee",
  "app.tagline": "Výdaje v partě bez dohadování",

  "auth.signIn": "Přihlásit se Googlem",
  "auth.signOut": "Odhlásit se",
  "auth.signedInAs": "Přihlášen jako {name}",
  "auth.loading": "Načítám…",

  "onboarding.title": "Vítej ve Splitee",
  "onboarding.nickname.label": "Jak ti mají ostatní říkat?",
  "onboarding.nickname.placeholder": "Přezdívka",
  "onboarding.color.label": "Tvoje barva",
  "onboarding.color.hint": "Podle ní tě parta pozná v grafu i ve výdajích.",
  "onboarding.submit": "Pokračovat",

  "common.saveFailed": "Nepovedlo se uložit.",

  // Kódy z ConvexError (viz lib/errors.ts) — Convex v produkci maže text
  // obyčejných Error zpráv, takže server posílá jen stabilní kód a UI si
  // českou větu dohledá tady.
  "error.notSignedIn": "Nejsi přihlášený.",
  "error.notOnboarded": "Nejdřív dokonči nastavení profilu.",
  "error.notMember": "Do téhle party nemáš přístup.",
  "error.nicknameEmpty": "Vyplň přezdívku.",
  "error.nicknameTooLong": "Přezdívka smí mít nejvýš {max} znaků.",
  "error.unknownAccent": "Neznámá barva akcentu.",
  "error.groupNameEmpty": "Parta potřebuje název.",
  "error.inviteCodeExhausted": "Nepodařilo se vygenerovat kód party, zkus to znovu.",
  "error.inviteCodeInvalid": "Takový kód nikam nevede.",
  "error.groupFull": "Parta je plná, víc než deset lidí to neutáhne.",
  "error.groupNotFound": "Parta neexistuje.",
  "error.unknownColor": "Neznámá barva.",
  "error.colorsExhausted": "Všech dvanáct barev je obsazených.",
  "error.groupUnavailable": "Tahle parta není dostupná — zkontroluj odkaz nebo se vrať na hlavní stránku.",

  // Výdaje a podíly (Task 6) — convex/lib/split.ts, convex/lib/money.ts, convex/expenses.ts
  "error.amountInvalid": "Částka musí být kladné celé číslo v haléřích.",
  "error.noParticipants": "Vyber aspoň jednoho člověka, který se skládá.",
  "error.weightInvalid": "Všechny váhy musí být kladné.",
  "error.splitAmountInvalid": "Podíly musí být nezáporná celá čísla v haléřích.",
  "error.splitSumMismatch": "Součet podílů ({total}) nesedí na částku výdaje ({amount}).",
  "error.amountFormatInvalid": "Zadej částku jako číslo, například 340,50.",
  "error.amountNotPositive": "Částka musí být větší než nula.",
  "error.amountTooLarge": "Částka musí být menší než 10 000 000 Kč.",
  "error.expenseTitleEmpty": "Napiš, za co to bylo.",
  "error.participantDuplicate": "Každý účastník smí být ve výdaji jen jednou.",
  "error.splitAmountMissing": "U přesného dělení zadej každému částku.",
  "error.expenseNotFound": "Výdaj neexistuje.",
  "error.spentAtInvalid": "Datum útraty není platné.",
  "error.categoryNotInGroup": "Tahle kategorie do party nepatří.",
  "error.expenseSettlementLocked": "Tenhle výdaj má už vyrovnaný podíl, nejdřív zruš vyrovnání.",

  "profile.title": "Tvůj profil",
  "profile.save": "Uložit",
  "nav.profile": "Profil",
  "nav.home": "Zpět na Splitee",

  "group.create": "Založit partu",
  "group.join": "Připojit se kódem",
  "group.name.label": "Jak se parta jmenuje?",
  "group.name.placeholder": "Spolubydlení",
  "group.emoji.label": "Emoji party",
  "group.code.label": "Kód party",
  "group.code.placeholder": "ABC123",
  "group.code.enter": "Zadej kód party",
  "group.full": "Parta je plná, víc než deset lidí to neutáhne.",
  "group.invite.title": "Pozvánka do party",
  "group.invite.hint": "Kdokoli s tímhle kódem nebo odkazem se může připojit.",
  "group.invite.copy": "Kopírovat odkaz",
  "group.invite.copied": "Zkopírováno",
  "group.switcher.newGroup": "Nová parta",
  "group.settings.title": "Nastavení party",
  "group.settings.members": "Členové",
  "group.role.owner": "Zakladatel",
  "group.role.member": "Člen",
  "group.empty.title": "Zatím nejsi v žádné partě",
  "group.empty.hint": "Založ novou partu, nebo se připoj ke stávající kódem od kamaráda.",
  "join.title": "Pozvánka do party",
  "join.notFound": "Tenhle kód nikam nevede.",
  "join.memberCount": "{count} členů",
  "join.joining": "Připojuju tě…",

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
