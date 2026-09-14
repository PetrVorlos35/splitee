# Splitee — jádro (fáze 1+2) — implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nasaditelná PWA na splitee.dejny.eu, kde se parta do 10 lidí přihlásí Googlem, založí nebo se připojí do party a loguje sdílené výdaje — s koláčem útraty, přehledem kdo komu kolik dluží a vyrovnáváním.

**Architecture:** Next.js App Router běží v Dockeru na VPS za nginx proxy; všechna data a realtime jedou přes hostovaný Convex, takže nový výdaj se všem propíše bez refreshe. Veškerá peněžní matematika žije v čistých funkcích bez Convex importů (`convex/lib/`), aby šla testovat samostatně a rychle; Convex mutace jsou jen tenká vrstva nad nimi, která řeší oprávnění a zápis.

**Tech Stack:** Next.js 16.3, React 19.3, TypeScript, Convex 1.45 + @convex-dev/auth 0.0.95 (Google), Tailwind CSS 4.3, Motion 13.3, vitest 5 + convex-test 0.0.58, Docker, nginx, certbot

**Spec:** `docs/superpowers/specs/2026-09-14-splitee-design.md`

**Rozsah tohoto plánu:** fáze 1 a 2 ze spec §10. OCR účtenek, historie s filtry, statistiky v čase, opakované výdaje, CSV export a push notifikace dostanou vlastní plány, až jádro poběží v produkci.

## Global Constraints

- **Peníze jsou vždy integer v haléřích.** Nikde v kódu se částka neukládá ani nepočítá jako float. Formátování na „340,50 Kč" se děje až v zobrazovací vrstvě.
- **Invariant, který nesmí padnout:** `Σ splits.amount === expense.amount` pro každý výdaj, v každém režimu dělení.
- **Limit 10 členů party se vynucuje v Convex mutaci**, ne jen v UI.
- **Žádná obchodní logika v React komponentách.** Výpočty patří do `convex/lib/`, dotazy do `convex/`, komponenty jen zobrazují.
- **Jazyk UI je čeština**, ale všechny texty jdou přes `lib/i18n.ts`. Žádné české řetězce natvrdo v JSX.
- **Barva nese význam.** Osobní barva člena je jeho identita napříč koláčem, feedem i dluhy. Používá se výhradně z `lib/colors.ts`, nikdy se nevymýšlí ad hoc.
- **Node 22** v Dockeru (systémový node na VPS je v12 a je nepoužitelný).
- **Kontejner poslouchá na `127.0.0.1:3011`**, nikdy na `0.0.0.0`.
- **Convex secrets nikdy nejdou do repa.** `.env.local` je v `.gitignore`, `.env.example` obsahuje jen názvy proměnných.
- Commit po každém dokončeném kroku, který nechá strom v zelených testech.

---

## Struktura souborů

```
splitee/
├─ convex/
│  ├─ schema.ts                  tabulky a indexy
│  ├─ auth.ts, auth.config.ts    Convex Auth + Google
│  ├─ lib/                       ČISTÉ funkce, žádný Convex import — jádro testů
│  │  ├─ split.ts                splitEqual / splitShares / validateExact
│  │  ├─ debts.ts                aggregateDebts
│  │  ├─ money.ts                parsování a formátování haléřů
│  │  ├─ inviteCode.ts           generování kódu party
│  │  └─ period.ts               rozsahy období pro koláč a feed
│  ├─ users.ts                   profil, přezdívka, akcent
│  ├─ groups.ts                  založení, vstup kódem, seznam, členové
│  ├─ categories.ts              výchozí sada + vlastní
│  ├─ expenses.ts                výdaje a jejich podíly
│  ├─ settlements.ts             vyrovnání jednotlivé i hromadné
│  ├─ stats.ts                   data pro koláč
│  └─ tests/                     vitest + convex-test
├─ app/
│  ├─ layout.tsx, globals.css, ConvexClientProvider.tsx
│  ├─ page.tsx                   landing / rozcestník
│  ├─ onboarding/page.tsx        přezdívka + barva + první parta
│  ├─ join/[code]/page.tsx       vstup z odkazu nebo QR
│  ├─ g/[groupId]/
│  │  ├─ layout.tsx              header s přepínačem party
│  │  ├─ page.tsx                hlavní obrazovka
│  │  ├─ add/page.tsx            nový výdaj
│  │  └─ settings/page.tsx       členové, kód, kategorie
│  └─ me/page.tsx                profil a akcent
├─ components/
│  ├─ ui/                        Button, Sheet, Field, Avatar, Money, SegmentedControl
│  ├─ donut/                     DonutChart, DonutCenter, useDonutSegments
│  ├─ debts/                     DebtCard, SettleSheet
│  ├─ expenses/                  ExpenseFeed, ExpenseRow, ExpenseForm, SplitEditor
│  ├─ groups/                    GroupSwitcher, InviteSheet, MemberList
│  └─ Fab.tsx
├─ lib/
│  ├─ colors.ts                  MEMBER_COLORS — jediný zdroj barev
│  ├─ money.ts                   formátování pro klienta
│  ├─ dates.ts                   období
│  └─ i18n.ts                    český slovník
├─ public/                       manifest.webmanifest, ikony, sw.js
├─ middleware.ts
├─ Dockerfile, deploy.sh, ops/splitee.dejny.eu.nginx
└─ vitest.config.ts
```

Dělicí princip: `convex/lib/` neví nic o Convexu ani o Reactu a je plně pokryté testy; `convex/*.ts` řeší oprávnění a zápis; komponenty jen zobrazují. Díky tomu jde to, co se nejčastěji rozbije — dělení částek a výpočet dluhů — testovat bez databáze a v milisekundách.

---
### Task 2: Čisté peněžní výpočty

Srdce aplikace. Žádný import z `convex/_generated` ani z Reactu — jen vstup a výstup, takže testy běží v milisekundách a chytí přesně ty chyby, které v takové appce bolí nejvíc: ztracené haléře a špatně spočítaný dluh.

**Files:**
- Create: `convex/lib/split.ts`
- Create: `convex/lib/debts.ts`
- Create: `convex/lib/money.ts`
- Create: `convex/lib/inviteCode.ts`
- Create: `convex/lib/period.ts`
- Test: `convex/tests/split.test.ts`
- Test: `convex/tests/debts.test.ts`
- Test: `convex/tests/money.test.ts`
- Test: `convex/tests/inviteCode.test.ts`

**Interfaces:**
- Consumes: nic (nejspodnější vrstva, závisí jen na Tasku 1 kvůli vitestu)
- Produces:
  - `type Participant = { userId: string; joinedAt: number; weight?: number }`
  - `type SplitRow = { userId: string; amount: number }`
  - `splitEqual(amount: number, participants: Participant[]): SplitRow[]`
  - `splitShares(amount: number, participants: Participant[]): SplitRow[]`
  - `validateExact(amount: number, entries: SplitRow[]): SplitRow[]`
  - `type RawDebt = { debtorId: string; creditorId: string; amount: number }`
  - `type Debt = { from: string; to: string; amount: number }`
  - `aggregateDebts(unsettled: RawDebt[]): Debt[]`
  - `parseAmount(input: string): number` — „340,50" → `34050`
  - `formatAmount(haleru: number, currency: string): string` — `34050` → „340,50 Kč"
  - `generateInviteCode(rng?: () => number): string`
  - `periodRange(period: "thisMonth" | "lastMonth" | "all", now: number): { from: number; to: number }`

- [ ] **Step 1: Napiš padající testy dělení částky**

Vytvoř `convex/tests/split.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { splitEqual, splitShares, validateExact } from "../lib/split";

const P = (...ids: string[]) => ids.map((userId, i) => ({ userId, joinedAt: i }));
const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

describe("splitEqual", () => {
  it("rozdělí 100 Kč mezi tři tak, že součet sedí na haléř", () => {
    const rows = splitEqual(10000, P("a", "b", "c"));
    expect(rows).toEqual([
      { userId: "a", amount: 3334 },
      { userId: "b", amount: 3333 },
      { userId: "c", amount: 3333 },
    ]);
    expect(sum(rows)).toBe(10000);
  });

  it("dělí beze zbytku, když to vyjde", () => {
    expect(splitEqual(9000, P("a", "b", "c"))).toEqual([
      { userId: "a", amount: 3000 },
      { userId: "b", amount: 3000 },
      { userId: "c", amount: 3000 },
    ]);
  });

  it("dá jediný haléř prvnímu podle pořadí vstupu do party", () => {
    expect(splitEqual(1, P("a", "b", "c"))).toEqual([
      { userId: "a", amount: 1 },
      { userId: "b", amount: 0 },
      { userId: "c", amount: 0 },
    ]);
  });

  it("dá stejný výsledek bez ohledu na pořadí vstupního pole", () => {
    const shuffled = [
      { userId: "c", joinedAt: 2 },
      { userId: "a", joinedAt: 0 },
      { userId: "b", joinedAt: 1 },
    ];
    expect(splitEqual(10000, shuffled)).toEqual(splitEqual(10000, P("a", "b", "c")));
  });

  it("součet sedí pro každý počet lidí 1..10 a každou částku 1..2000", () => {
    const ids = "abcdefghij".split("");
    for (let n = 1; n <= 10; n++) {
      for (let amount = 1; amount <= 2000; amount++) {
        expect(sum(splitEqual(amount, P(...ids.slice(0, n))))).toBe(amount);
      }
    }
  });

  it("odmítne nulovou a zápornou částku", () => {
    expect(() => splitEqual(0, P("a"))).toThrow();
    expect(() => splitEqual(-100, P("a"))).toThrow();
  });

  it("odmítne výdaj bez účastníků", () => {
    expect(() => splitEqual(10000, [])).toThrow();
  });
});

describe("splitShares", () => {
  it("rozdělí v poměru 2:1:1", () => {
    const rows = splitShares(10000, [
      { userId: "a", joinedAt: 0, weight: 2 },
      { userId: "b", joinedAt: 1, weight: 1 },
      { userId: "c", joinedAt: 2, weight: 1 },
    ]);
    expect(rows).toEqual([
      { userId: "a", amount: 5000 },
      { userId: "b", amount: 2500 },
      { userId: "c", amount: 2500 },
    ]);
  });

  it("se stejnými váhami se chová jako rovný díl", () => {
    const weighted = splitShares(10000, [
      { userId: "a", joinedAt: 0, weight: 1 },
      { userId: "b", joinedAt: 1, weight: 1 },
      { userId: "c", joinedAt: 2, weight: 1 },
    ]);
    expect(weighted).toEqual(splitEqual(10000, P("a", "b", "c")));
  });

  it("rozdá zbytkové haléře metodou největšího zbytku a součet sedí", () => {
    const rows = splitShares(10001, [
      { userId: "a", joinedAt: 0, weight: 3 },
      { userId: "b", joinedAt: 1, weight: 1 },
      { userId: "c", joinedAt: 2, weight: 1 },
    ]);
    expect(rows).toEqual([
      { userId: "a", amount: 6001 },
      { userId: "b", amount: 2000 },
      { userId: "c", amount: 2000 },
    ]);
    expect(sum(rows)).toBe(10001);
  });

  it("odmítne nulovou nebo zápornou váhu", () => {
    expect(() =>
      splitShares(10000, [
        { userId: "a", joinedAt: 0, weight: 1 },
        { userId: "b", joinedAt: 1, weight: 0 },
      ]),
    ).toThrow();
  });
});

describe("validateExact", () => {
  it("projde, když součet sedí", () => {
    const entries = [
      { userId: "a", amount: 6000 },
      { userId: "b", amount: 4000 },
    ];
    expect(validateExact(10000, entries)).toEqual(entries);
  });

  it("spadne, když součet nesedí", () => {
    expect(() =>
      validateExact(10000, [
        { userId: "a", amount: 6000 },
        { userId: "b", amount: 3999 },
      ]),
    ).toThrow(/nesedí/);
  });

  it("spadne na záporném podílu", () => {
    expect(() =>
      validateExact(10000, [
        { userId: "a", amount: 11000 },
        { userId: "b", amount: -1000 },
      ]),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Spusť testy a ověř, že padají**

Run: `npx vitest run convex/tests/split.test.ts`
Expected: FAIL — `Failed to resolve import "../lib/split"`

- [ ] **Step 3: Naimplementuj dělení částky**

Vytvoř `convex/lib/split.ts`. Tenhle kód je ověřený — invariant „součet podílů = částka" prošel na 20 000 kombinacích. Neupravuj pořadí operací, drží determinismus:

```ts
export type Participant = { userId: string; joinedAt: number; weight?: number };
export type SplitRow = { userId: string; amount: number };

/** Deterministické pořadí účastníků: podle vstupu do party, při shodě podle id. */
function byJoinOrder(a: { joinedAt: number; userId: string }, b: { joinedAt: number; userId: string }) {
  return a.joinedAt - b.joinedAt || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
}

function assertAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Částka musí být kladné celé číslo v haléřích.");
  }
}

export function splitEqual(amount: number, participants: Participant[]): SplitRow[] {
  assertAmount(amount);
  if (participants.length === 0) throw new Error("Výdaj musí mít aspoň jednoho účastníka.");

  const ordered = [...participants].sort(byJoinOrder);
  const base = Math.floor(amount / ordered.length);
  const remainder = amount - base * ordered.length;

  // zbytkové haléře dostanou první podle pořadí vstupu do party
  return ordered.map((p, i) => ({ userId: p.userId, amount: base + (i < remainder ? 1 : 0) }));
}

export function splitShares(amount: number, participants: Participant[]): SplitRow[] {
  assertAmount(amount);
  if (participants.length === 0) throw new Error("Výdaj musí mít aspoň jednoho účastníka.");
  if (participants.some((p) => !(p.weight! > 0))) throw new Error("Všechny váhy musí být kladné.");

  const totalWeight = participants.reduce((s, p) => s + p.weight!, 0);
  const rows = participants.map((p) => {
    const exact = (amount * p.weight!) / totalWeight;
    const floored = Math.floor(exact);
    return { userId: p.userId, joinedAt: p.joinedAt, amount: floored, frac: exact - floored };
  });

  // metoda největšího zbytku; při shodě zlomků rozhoduje pořadí vstupu do party
  const remainder = amount - rows.reduce((s, r) => s + r.amount, 0);
  const byFrac = [...rows].sort((a, b) => b.frac - a.frac || byJoinOrder(a, b));
  for (let i = 0; i < remainder; i++) byFrac[i].amount += 1;

  return rows.sort(byJoinOrder).map((r) => ({ userId: r.userId, amount: r.amount }));
}

export function validateExact(amount: number, entries: SplitRow[]): SplitRow[] {
  if (entries.some((e) => !Number.isInteger(e.amount) || e.amount < 0)) {
    throw new Error("Podíly musí být nezáporná celá čísla v haléřích.");
  }
  const total = entries.reduce((s, e) => s + e.amount, 0);
  if (total !== amount) {
    throw new Error(`Součet podílů (${total}) nesedí na částku výdaje (${amount}).`);
  }
  return entries;
}
```

- [ ] **Step 4: Spusť testy a ověř, že prochází**

Run: `npx vitest run convex/tests/split.test.ts`
Expected: PASS, 14 testů

- [ ] **Step 5: Commit**

```bash
git add convex/lib/split.ts convex/tests/split.test.ts
git commit -m "feat: dělení částky rovným dílem, podíly a přesnými částkami"
```

- [ ] **Step 6: Napiš padající testy výpočtu dluhů**

Vytvoř `convex/tests/debts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aggregateDebts } from "../lib/debts";

describe("aggregateDebts", () => {
  it("sečte víc nevyrovnaných podílů na jednu dvojici", () => {
    expect(
      aggregateDebts([
        { debtorId: "petr", creditorId: "ja", amount: 34000 },
        { debtorId: "petr", creditorId: "ja", amount: 12000 },
        { debtorId: "ja", creditorId: "jana", amount: 8000 },
      ]),
    ).toEqual([
      { from: "petr", to: "ja", amount: 46000 },
      { from: "ja", to: "jana", amount: 8000 },
    ]);
  });

  it("vyruší vzájemné dluhy a nechá jen rozdíl", () => {
    expect(
      aggregateDebts([
        { debtorId: "a", creditorId: "b", amount: 30000 },
        { debtorId: "b", creditorId: "a", amount: 10000 },
      ]),
    ).toEqual([{ from: "a", to: "b", amount: 20000 }]);
  });

  it("nezobrazí dvojici, která je po vyrušení na nule", () => {
    expect(
      aggregateDebts([
        { debtorId: "a", creditorId: "b", amount: 10000 },
        { debtorId: "b", creditorId: "a", amount: 10000 },
      ]),
    ).toEqual([]);
  });

  it("ignoruje podíl plátce sám sobě", () => {
    expect(aggregateDebts([{ debtorId: "a", creditorId: "a", amount: 5000 }])).toEqual([]);
  });

  it("řadí od největšího dluhu", () => {
    const rows = aggregateDebts([
      { debtorId: "a", creditorId: "x", amount: 100 },
      { debtorId: "b", creditorId: "x", amount: 900 },
      { debtorId: "c", creditorId: "x", amount: 500 },
    ]);
    expect(rows.map((r) => r.amount)).toEqual([900, 500, 100]);
  });

  it("vrátí prázdno, když není co vyrovnávat", () => {
    expect(aggregateDebts([])).toEqual([]);
  });
});
```

- [ ] **Step 7: Spusť testy a ověř, že padají**

Run: `npx vitest run convex/tests/debts.test.ts`
Expected: FAIL — `Failed to resolve import "../lib/debts"`

- [ ] **Step 8: Naimplementuj výpočet dluhů**

Vytvoř `convex/lib/debts.ts`. Vzájemné dluhy se vyruší — „Petr ti dluží 300 a ty jemu 100" se v UI musí ukázat jako jedna karta „Petr ti dluží 200", ne jako dvě protichůdné:

```ts
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
```

- [ ] **Step 9: Spusť testy a ověř, že prochází**

Run: `npx vitest run convex/tests/debts.test.ts`
Expected: PASS, 6 testů

- [ ] **Step 10: Commit**

```bash
git add convex/lib/debts.ts convex/tests/debts.test.ts
git commit -m "feat: výpočet dluhů z nevyrovnaných podílů s vyrušením vzájemných"
```

- [ ] **Step 11: Napiš padající testy peněz a invite kódu**

Vytvoř `convex/tests/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "../lib/money";

describe("parseAmount", () => {
  it("bere desetinnou čárku i tečku", () => {
    expect(parseAmount("340,50")).toBe(34050);
    expect(parseAmount("340.50")).toBe(34050);
  });

  it("doplní chybějící haléře", () => {
    expect(parseAmount("340")).toBe(34000);
    expect(parseAmount("340,5")).toBe(34050);
  });

  it("ignoruje mezery včetně nezlomitelné", () => {
    expect(parseAmount("1 234,50")).toBe(123450);
    expect(parseAmount("1\u00A0234,50")).toBe(123450); // nezlomitelná mezera
  });

  it("zaokrouhlí na haléře", () => {
    expect(parseAmount("340,567")).toBe(34057);
  });

  it("spadne na nesmyslném vstupu", () => {
    expect(() => parseAmount("")).toThrow();
    expect(() => parseAmount("abc")).toThrow();
    expect(() => parseAmount("-50")).toThrow();
  });
});

describe("formatAmount", () => {
  it("vypíše částku česky s měnou", () => {
    expect(formatAmount(34050, "CZK").replace(/\u00A0/g, " ")).toBe("340,50 Kč");
  });

  it("vypíše i celé koruny s haléři", () => {
    expect(formatAmount(34000, "CZK").replace(/\u00A0/g, " ")).toBe("340,00 Kč");
  });

  it("umí i jinou měnu party", () => {
    expect(formatAmount(1050, "EUR")).toContain("10,50");
  });
});
```

Vytvoř `convex/tests/inviteCode.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { INVITE_ALPHABET, generateInviteCode } from "../lib/inviteCode";

describe("generateInviteCode", () => {
  it("má šest znaků", () => {
    expect(generateInviteCode()).toHaveLength(6);
  });

  it("používá jen znaky z abecedy bez zaměnitelných", () => {
    for (let i = 0; i < 200; i++) {
      for (const ch of generateInviteCode()) {
        expect(INVITE_ALPHABET).toContain(ch);
      }
    }
  });

  it("neobsahuje nulu, O, jedničku, I ani L", () => {
    expect(INVITE_ALPHABET).not.toMatch(/[0O1IL]/);
  });

  it("je deterministický, když mu dáš vlastní generátor", () => {
    const rng = () => 0;
    expect(generateInviteCode(rng)).toBe(INVITE_ALPHABET[0].repeat(6));
  });
});
```

- [ ] **Step 12: Spusť testy a ověř, že padají**

Run: `npx vitest run convex/tests/money.test.ts convex/tests/inviteCode.test.ts`
Expected: FAIL — nevyřešené importy `../lib/money` a `../lib/inviteCode`

- [ ] **Step 13: Naimplementuj peníze, invite kód a období**

Vytvoř `convex/lib/money.ts`:

```ts
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
```

Vytvoř `convex/lib/inviteCode.ts`:

```ts
/** Bez 0/O a 1/I/L — kód se opisuje z displeje, záměna by lidi zdržovala. */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 6;

export function generateInviteCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_ALPHABET[Math.floor(rng() * INVITE_ALPHABET.length)];
  }
  return code;
}
```

Vytvoř `convex/lib/period.ts`:

```ts
export type Period = "thisMonth" | "lastMonth" | "all";

/** Rozsah pro koláč a feed. `all` sahá od nuly do teď. */
export function periodRange(period: Period, now: number): { from: number; to: number } {
  if (period === "all") return { from: 0, to: now };

  const d = new Date(now);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const offset = period === "lastMonth" ? -1 : 0;

  return {
    from: Date.UTC(year, month + offset, 1),
    to: Date.UTC(year, month + offset + 1, 1) - 1,
  };
}
```

- [ ] **Step 14: Spusť celou sadu testů**

Run: `npx vitest run convex/tests/`
Expected: PASS — všechny soubory zelené

- [ ] **Step 15: Commit**

```bash
git add convex/lib/money.ts convex/lib/inviteCode.ts convex/lib/period.ts convex/tests/money.test.ts convex/tests/inviteCode.test.ts
git commit -m "feat: parsování a formátování haléřů, invite kód, rozsahy období"
```

---
