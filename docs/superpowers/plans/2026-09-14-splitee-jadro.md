# Splitee — jádro (fáze 1+2) — implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nasaditelná PWA na splitee.dejny.eu, kde se parta do 10 lidí přihlásí Googlem, založí nebo se připojí do party a loguje sdílené výdaje — s koláčem útraty, přehledem kdo komu kolik dluží a vyrovnáváním.

**Architecture:** Next.js App Router běží v Dockeru na VPS za nginx proxy; všechna data a realtime jedou přes hostovaný Convex, takže nový výdaj se všem propíše bez refreshe. Veškerá peněžní matematika žije v čistých funkcích bez Convex importů (`convex/lib/`), aby šla testovat samostatně a rychle; Convex mutace jsou jen tenká vrstva nad nimi, která řeší oprávnění a zápis.

**Tech Stack:** Next.js 15.5.25, React 19.3, TypeScript, Convex 1.45 + @convex-dev/auth 0.0.95 (Google), @auth/core 0.41.3, Tailwind CSS 4.3, Motion 13.3, vitest 5 + convex-test 0.0.58, Docker, nginx, certbot

**Proč Next.js 15, a ne 16:** Convex Auth je beta a testovaná proti Next.js 15 (oficiální šablona jede na 15.5.7). Next.js 16 přejmenoval `middleware.ts` na `proxy.ts` a v repu `convex-auth` o `proxy.ts` není ani zmínka — ta kombinace je neověřená. Až Convex Auth Next.js 16 oficiálně podpoří, je to upgrade na jedno odpoledne; teď by to byla hodina hádání, proč middleware nevidí přihlášeného uživatele.

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
### Task 1: Kostra projektu, Convex, Tailwind a PWA

Cílem je běžící `npm run dev`, instalovatelná PWA a funkční testovací smyčka. Nic z aplikační logiky sem nepatří.

**Files:**
- Create: celý Next.js skeleton přes `create-next-app` v `/Users/dejny/Webs/splitee`
- Create: `vitest.config.ts`
- Create: `lib/colors.ts`
- Create: `lib/i18n.ts`
- Create: `public/manifest.webmanifest`
- Create: `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- Create: `scripts/icons.mjs`
- Create: `public/sw.js`
- Create: `components/RegisterServiceWorker.tsx`
- Create: `.env.example`
- Modify: `app/layout.tsx`
- Modify: `.gitignore`
- Test: `lib/colors.test.ts`

**Interfaces:**
- Consumes: nic
- Produces:
  - `MEMBER_COLORS: readonly { key: string; name: string; hex: string; textOn: "black" | "white" }[]`
  - `colorByKey(key: string): (typeof MEMBER_COLORS)[number]`
  - `firstFreeColor(taken: string[]): string` — vrací `key`, ne hex
  - `t(key: string, vars?: Record<string, string | number>): string` z `lib/i18n.ts`

- [ ] **Step 1: Vygeneruj Next.js projekt**

Adresář `/Users/dejny/Webs/splitee` už obsahuje `.git`, `.gitignore` a `docs/` — všechny tři jsou na seznamu povolených souborů `create-next-app`, takže generátor nic nepřepíše a nebude si stěžovat.

```bash
cd /Users/dejny/Webs/splitee
npx create-next-app@15.5.25 . --typescript --tailwind --app --no-src-dir --eslint --import-alias "@/*" --use-npm --turbopack
```

- [ ] **Step 2: Doinstaluj závislosti**

`@auth/core` se pinuje explicitně — `@convex-dev/auth@0.0.95` chce `^0.41.1` a bez pinu hodí npm `ERESOLVE`.

```bash
npm install convex@1.45.0 @convex-dev/auth@0.0.95 @auth/core@0.41.3 motion@13.3.0 qrcode@1.5.4
npm install -D convex-test@0.0.58 vitest@5.0.0 @edge-runtime/vm@5.0.0 @types/qrcode sharp
```

- [ ] **Step 3: Nastav vitest**

Vytvoř `vitest.config.ts`. **`server.deps.inline` je povinné** — bez něj convex-test spadne na `TypeError: (intermediate value).glob is not a function`, protože má v distu zadrátované `import.meta.glob` a Vite ho jinak externalizuje. V oficiálních docs tenhle řádek chybí:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
          // bez tohoto řádku convex-test spadne na import.meta.glob
          server: { deps: { inline: ["convex-test"] } },
        },
      },
      {
        extends: true,
        test: {
          name: "lib",
          include: ["lib/**/*.test.ts"],
          exclude: ["convex/**", "node_modules/**"],
          environment: "node",
        },
      },
    ],
  },
});
```

Do `package.json` přidej scripty:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "test:once": "vitest run",
  "icons": "node scripts/icons.mjs"
}
```

- [ ] **Step 4: Napiš padající test palety barev**

Vytvoř `lib/colors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MEMBER_COLORS, colorByKey, firstFreeColor } from "./colors";

describe("MEMBER_COLORS", () => {
  it("má dvanáct barev, aby vystačily i na plnou partu", () => {
    expect(MEMBER_COLORS).toHaveLength(12);
  });

  it("nemá duplicitní klíč ani hex", () => {
    expect(new Set(MEMBER_COLORS.map((c) => c.key)).size).toBe(12);
    expect(new Set(MEMBER_COLORS.map((c) => c.hex)).size).toBe(12);
  });

  it("má všechny hexy v platném tvaru", () => {
    for (const c of MEMBER_COLORS) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("u každé barvy říká, jestli na ní má být černý nebo bílý text", () => {
    for (const c of MEMBER_COLORS) expect(["black", "white"]).toContain(c.textOn);
  });
});

describe("colorByKey", () => {
  it("najde barvu podle klíče", () => {
    expect(colorByKey("red").hex).toBe("#F25A5A");
  });

  it("u neznámého klíče spadne, ať se to nepropíše do UI jako průhledná barva", () => {
    expect(() => colorByKey("neexistuje")).toThrow();
  });
});

describe("firstFreeColor", () => {
  it("v prázdné partě dá první barvu", () => {
    expect(firstFreeColor([])).toBe("red");
  });

  it("přeskočí obsazené barvy", () => {
    expect(firstFreeColor(["red", "orange"])).toBe("amber");
  });

  it("spadne, až když je obsazených všech dvanáct", () => {
    const all = MEMBER_COLORS.map((c) => c.key);
    expect(() => firstFreeColor(all)).toThrow();
  });
});
```

- [ ] **Step 5: Spusť test a ověř, že padá**

Run: `npx vitest run --project lib`
Expected: FAIL — `Failed to resolve import "./colors"`

- [ ] **Step 6: Naimplementuj paletu**

Vytvoř `lib/colors.ts`. Hodnoty jsou vygenerované a ověřené: odstíny po 30°, každá barva má kontrast ≥3:1 vůči bílému pozadí (aby byl segment koláče na bílé vidět) a ≥4,5:1 vůči svému textu. Neměň hexy od oka — rozbilo by to obojí:

```ts
export const MEMBER_COLORS = [
  { key: "red", name: "Červená", hex: "#F25A5A", textOn: "black" },
  { key: "orange", name: "Oranžová", hex: "#CE8339", textOn: "black" },
  { key: "mustard", name: "Hořčicová", hex: "#999926", textOn: "black" },
  { key: "olive", name: "Olivová", hex: "#67A529", textOn: "black" },
  { key: "green", name: "Zelená", hex: "#2BAB2B", textOn: "black" },
  { key: "emerald", name: "Smaragdová", hex: "#2AA96A", textOn: "black" },
  { key: "teal", name: "Tyrkysová", hex: "#29A3A3", textOn: "black" },
  { key: "cyan", name: "Azurová", hex: "#5099E2", textOn: "black" },
  { key: "blue", name: "Modrá", hex: "#5A5AF2", textOn: "white" },
  { key: "indigo", name: "Indigová", hex: "#A65AF2", textOn: "black" },
  { key: "violet", name: "Fialová", hex: "#DF62DF", textOn: "black" },
  { key: "purple", name: "Purpurová", hex: "#F25AA6", textOn: "black" },
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

export function colorByKey(key: string): MemberColor {
  const found = MEMBER_COLORS.find((c) => c.key === key);
  if (!found) throw new Error(`Neznámá barva člena: ${key}`);
  return found;
}

/** Barvy se v partě nesmí opakovat — jsou to identity, ne dekorace. */
export function firstFreeColor(taken: string[]): string {
  const free = MEMBER_COLORS.find((c) => !taken.includes(c.key));
  if (!free) throw new Error("Všech dvanáct barev je obsazených.");
  return free.key;
}
```

- [ ] **Step 7: Spusť test a ověř, že prochází**

Run: `npx vitest run --project lib`
Expected: PASS, 9 testů

- [ ] **Step 8: Založ český slovník**

Vytvoř `lib/i18n.ts`. Do UI se nikdy nepíše český řetězec natvrdo — tohle je jediné místo, kde texty žijí:

```ts
const cs: Record<string, string> = {
  "app.name": "Splitee",
  "app.tagline": "Výdaje v partě bez dohadování",

  "auth.signIn": "Přihlásit se Googlem",
  "auth.signOut": "Odhlásit se",

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
```

- [ ] **Step 9: Commit**

```bash
git add lib/colors.ts lib/colors.test.ts lib/i18n.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: kostra projektu, paleta barev členů a český slovník"
```

- [ ] **Step 10: Vytvoř ikonu a vygeneruj PWA obrázky**

Vytvoř `public/icon.svg` — koláč ve třech barvách z palety, což je přesně to, co appka ukazuje na hlavní obrazovce:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF"/>
  <g transform="rotate(-90 256 256)" fill="none" stroke-width="88">
    <circle cx="256" cy="256" r="170" stroke="#F25A5A"
            stroke-dasharray="534.0708 534.0708" stroke-dashoffset="0"/>
    <circle cx="256" cy="256" r="170" stroke="#5099E2"
            stroke-dasharray="320.4425 747.6990" stroke-dashoffset="-534.0708"/>
    <circle cx="256" cy="256" r="170" stroke="#A65AF2"
            stroke-dasharray="213.6283 854.5132" stroke-dashoffset="-854.5133"/>
  </g>
</svg>
```

Vytvoř `scripts/icons.mjs`:

```js
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icon.svg");

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log("zapsáno", file);
}

// maskable potřebuje rezervu na okrajích, jinak si ji Android ořízne do kruhu
await sharp(svg)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#FFFFFF" })
  .png()
  .toFile("public/icon-maskable-512.png");
console.log("zapsáno public/icon-maskable-512.png");
```

Run: `npm run icons`
Expected: čtyři řádky „zapsáno …", soubory existují

- [ ] **Step 11: Přidej manifest a service worker**

Vytvoř `public/manifest.webmanifest`:

```json
{
  "name": "Splitee",
  "short_name": "Splitee",
  "description": "Výdaje v partě bez dohadování",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFFFF",
  "theme_color": "#FFFFFF",
  "lang": "cs",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Vytvoř `public/sw.js`. Navigace jde vždy nejdřív na síť — appka je realtime a servírovat z cache zastaralý HTML by znamenalo ukazovat staré bilance. Cache je jen záchrana pro offline:

```js
const CACHE = "splitee-v1";
const OFFLINE_FALLBACK = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_FALLBACK)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Convex a Cloudinary nikdy necachujeme

  // statické buildy Nextu jsou neměnné -> cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // navigace -> síť, cache jen když je uživatel offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(OFFLINE_FALLBACK, copy));
          return res;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK).then((hit) => hit ?? Response.error())),
    );
  }
});
```

Vytvoř `components/RegisterServiceWorker.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registrace selhala (např. dev přes http bez localhost) — appka funguje i bez ní
    });
  }, []);
  return null;
}
```

- [ ] **Step 12: Zapoj manifest a viewport do layoutu**

Přepiš `app/layout.tsx` (Convex providery sem přibudou v Tasku 3):

```tsx
import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splitee",
  description: "Výdaje v partě bez dohadování",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Splitee", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // kvůli bezpečným zónám na iPhonu s výřezem
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="bg-white text-black antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
```

- [ ] **Step 13: Ověř build a spusť appku**

Run: `npm run build`
Expected: build projde bez chyb

Run: `npm run dev` a otevři `http://localhost:3000`
Expected: stránka se načte; v DevTools → Application → Manifest je vidět „Splitee" s ikonami a appka je nabídnutá k instalaci

- [ ] **Step 14: Doplň .gitignore a .env.example**

Přidej na konec `.gitignore`:

```
.env.local
.env*.local
```

Vytvoř `.env.example` (jen názvy, nikdy hodnoty):

```
# Convex — zapisuje `npx convex dev`
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Nasazení
SITE_URL=https://splitee.dejny.eu
```

- [ ] **Step 15: Commit**

```bash
git add public scripts components/RegisterServiceWorker.tsx app/layout.tsx .gitignore .env.example package.json
git commit -m "feat: PWA manifest, ikony a service worker"
```

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

### Task 3: Convex schéma a přihlášení Googlem

Po tomhle tasku se jde přihlásit Googlem a v Convexu existují všechny tabulky. Žádná aplikační logika kromě dotazu na přihlášeného uživatele.

**Files:**
- Create: `convex/schema.ts`
- Create: `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`
- Create: `convex/users.ts`
- Create: `convex/tests/helpers.ts`
- Create: `convex/tests/auth.test.ts`
- Create: `middleware.ts`
- Create: `app/ConvexClientProvider.tsx`
- Modify: `app/layout.tsx`
- Modify: `convex/tsconfig.json`

**Interfaces:**
- Consumes: `lib/colors.ts` (`MEMBER_COLORS` pro výchozí akcent)
- Produces:
  - `schema` — default export z `convex/schema.ts`, používá ho každý test
  - `api.users.viewer` — query bez argumentů, vrací `Doc<"users"> | null`
  - `signedInAs(t, user?)` z `convex/tests/helpers.ts` — vrací `{ userId, sessionId, asUser }`
  - tabulky `groups`, `memberships`, `categories`, `expenses`, `splits`, `settlements` s indexy níže

**Odchylky od spec §3, vědomé:**
1. **`splits` nesou denormalizované `payerId` a `spentAt`.** Bez toho by výpočet dluhů musel ke každému podílu dotáhnout výdaj (N+1 dotazů při každé změně), což u realtime query běžící při každém překreslení nechceme. Cena je, že úprava výdaje musí podíly přepsat — proto je mutace `expenses.update` vždy maže a zakládá znovu, nikdy nepatchuje.
2. **`categories.groupId` je povinné.** Spec počítala s `null` pro výchozí sadu; místo toho se sedm výchozích kategorií zakládá při vzniku party. Odpadá tím zvláštní případ v každém dotazu a vlastní kategorie jsou pak jen další řádky.
3. **`recurringExpenses` a `pushSubscriptions` tu nejsou.** Patří k fázím 4 a 5 a Convex přidává tabulky bez migrace, takže není důvod je zakládat dopředu.

- [ ] **Step 1: Inicializuj Convex projekt**

```bash
npx convex dev
```

Přihlásí se přes prohlížeč, založí projekt `splitee`, vytvoří složku `convex/` a zapíše `CONVEX_DEPLOYMENT` a `NEXT_PUBLIC_CONVEX_URL` do `.env.local`. Nech běžet v samostatném terminálu — sleduje změny a nahrává funkce.

- [ ] **Step 2: Spusť init Convex Auth**

```bash
npx @convex-dev/auth
```

Vygeneruje `JWT_PRIVATE_KEY` a `JWKS` jako Convex env proměnné, nastaví `SITE_URL` na `http://localhost:3000`, upraví `convex/tsconfig.json` a založí `convex/auth.ts`, `convex/auth.config.ts` a `convex/http.ts`.

Ověř, že `convex/tsconfig.json` má obojí — bez toho neprojde typecheck importů z `@auth/core`:

```json
{
  "compilerOptions": {
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Založ OAuth klienta v Google Cloud Console**

Zjisti Convex deployment URL: dashboard → **Settings → URL & Deploy Key**. HTTP Actions URL je stejná jako deployment URL, ale končí na **`.convex.site`**, ne `.convex.cloud`.

V [Google Auth Platform](https://console.cloud.google.com/auth/overview):
1. Projekt → **GET STARTED** → název appky „Splitee", kontaktní e-mail → **External** → souhlas → **CREATE**
2. **Audience** → přidej svůj e-mail mezi testovací uživatele
3. **Clients → Create client → Web application**, název „Splitee dev"
4. **Authorized JavaScript origins:** `http://localhost:3000`
5. **Authorized redirect URIs:** `https://<deployment>.convex.site/api/auth/callback/google`

Redirect URI míří na **Convex backend**, ne na Next.js appku — `localhost:3000` v něm nefiguruje. Pro produkci se zakládá **samostatný klient**, protože prod deployment má jinou `.convex.site` doménu (řeší Task 14).

```bash
npx convex env set AUTH_GOOGLE_ID <client-id>
npx convex env set AUTH_GOOGLE_SECRET <client-secret>
npx convex env list
```

Expected: ve výpisu je `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`

- [ ] **Step 4: Napiš schéma**

Přepiš `convex/schema.ts`. Rozšíření tabulky `users` o vlastní pole je oficiálně podporované — samostatná tabulka profilů není potřeba. Vlastní pole **musí být `v.optional`**, protože je Google při registraci nedodá:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // přepisuje authTables.users — původní pole musí zůstat zachovaná
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // vlastní pole Splitee
    nickname: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    lastGroupId: v.optional(v.id("groups")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  groups: defineTable({
    name: v.string(),
    emoji: v.string(),
    currency: v.string(),
    inviteCode: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  }).index("by_inviteCode", ["inviteCode"]),

  memberships: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    color: v.string(), // klíč z MEMBER_COLORS, v rámci party unikátní
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(), // určuje pořadí při dělení zbytkových haléřů
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),

  categories: defineTable({
    groupId: v.id("groups"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    order: v.number(),
  }).index("by_group", ["groupId"]),

  expenses: defineTable({
    groupId: v.id("groups"),
    payerId: v.id("users"),
    amount: v.number(), // haléře
    title: v.string(),
    note: v.optional(v.string()),
    categoryId: v.id("categories"),
    spentAt: v.number(), // datum útraty, ne zadání
    splitMode: v.union(v.literal("equal"), v.literal("exact"), v.literal("shares")),
    source: v.union(v.literal("manual"), v.literal("receipt"), v.literal("recurring")),
    receiptImageUrl: v.optional(v.string()),
    receiptPublicId: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_group_spentAt", ["groupId", "spentAt"])
    .index("by_group_payer", ["groupId", "payerId"]),

  splits: defineTable({
    expenseId: v.id("expenses"),
    groupId: v.id("groups"),
    userId: v.id("users"),
    payerId: v.id("users"), // denormalizováno z výdaje kvůli výpočtu dluhů
    spentAt: v.number(), // denormalizováno kvůli koláči za období
    amount: v.number(),
    weight: v.optional(v.number()),
    settled: v.boolean(),
    settledAt: v.optional(v.number()),
    settlementId: v.optional(v.id("settlements")),
  })
    .index("by_expense", ["expenseId"])
    .index("by_group_settled", ["groupId", "settled"])
    .index("by_group_user_settled", ["groupId", "userId", "settled"])
    .index("by_group_spentAt", ["groupId", "spentAt"]),

  settlements: defineTable({
    groupId: v.id("groups"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    note: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_group", ["groupId"]),
});
```

- [ ] **Step 5: Nastav Google providera**

Přepiš `convex/auth.ts`. **Export `isAuthenticated` je povinný** — od verze 0.0.78 na něm stojí server-side kontrola v middleware a bez něj middleware spadne:

```ts
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { MEMBER_COLORS } from "../lib/colors";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    // běží při každém přihlášení; existingUserId === null znamená první registraci
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId === null) {
        await ctx.db.patch(userId, { accentColor: MEMBER_COLORS[8].hex });
      }
    },
  },
});
```

Pozn.: knihovna při každém přihlášení patchuje `name`, `email` a `image` z Google profilu. `patch` je mělký merge, takže `nickname` ani `accentColor` se nepřepíšou.

Ověř, že `convex/auth.config.ts` obsahuje:

```ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

a `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
```

- [ ] **Step 6: Přidej dotaz na přihlášeného uživatele**

Vytvoř `convex/users.ts`. Vždy `getAuthUserId`, nikdy `ctx.auth.getUserIdentity().subject` přímo — `subject` má tvar `"<userId>|<sessionId>"` a jako ID uživatele je nepoužitelný:

```ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId === null ? null : await ctx.db.get(userId);
  },
});
```

- [ ] **Step 7: Napiš testovací helper a padající test**

Vytvoř `convex/tests/helpers.ts`. **Tohle je past, kterou je potřeba obejít vědomě:** `t.withIdentity({ name: "Petr" })` vygeneruje náhodný číselný `subject`, takže `getAuthUserId` vrátí nesmyslné ID místo `null`. Guard `if (userId === null) throw` se neprovede, `ctx.db.get()` na neexistující ID vrátí `null` bez chyby a test projde zeleně, aniž by cokoli testoval. Identitu proto skládáme ručně ze skutečných ID:

```ts
import { convexTest } from "convex-test";
import schema from "../schema";

type TestConvex = ReturnType<typeof convexTest>;

/**
 * Založí uživatele i session a vrátí klienta, který se tváří jako přihlášený.
 * `subject` musí mít tvar "<userId>|<sessionId>" — přesně to getAuthUserId parsuje.
 */
export async function signedInAs(
  t: TestConvex,
  user: { name?: string; email?: string; nickname?: string } = {},
) {
  const { userId, sessionId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", user);
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expirationTime: Date.now() + 1000 * 60 * 60,
    });
    return { userId, sessionId };
  });

  return { userId, sessionId, asUser: t.withIdentity({ subject: `${userId}|${sessionId}` }) };
}

export function newTest() {
  return convexTest(schema);
}
```

Vytvoř `convex/tests/auth.test.ts`:

```ts
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { newTest, signedInAs } from "./helpers";

test("nepřihlášený uživatel nedostane profil", async () => {
  const t = newTest();
  expect(await t.query(api.users.viewer, {})).toBeNull();
});

test("přihlášený uživatel dostane svůj profil", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { name: "Petr", email: "petr@example.com" });

  const viewer = await asUser.query(api.users.viewer, {});
  expect(viewer?._id).toBe(userId);
  expect(viewer?.name).toBe("Petr");
});

test("dva přihlášení uživatelé se nepletou", async () => {
  const t = newTest();
  const petr = await signedInAs(t, { name: "Petr" });
  const jana = await signedInAs(t, { name: "Jana" });

  expect((await petr.asUser.query(api.users.viewer, {}))?.name).toBe("Petr");
  expect((await jana.asUser.query(api.users.viewer, {}))?.name).toBe("Jana");
});
```

- [ ] **Step 8: Spusť testy**

Run: `npx vitest run --project convex convex/tests/auth.test.ts`
Expected: PASS, 3 testy

Pokud to spadne na `TypeError: (intermediate value).glob is not a function`, chybí `server.deps.inline: ["convex-test"]` ve `vitest.config.ts` z Tasku 1.

- [ ] **Step 9: Přidej middleware**

Vytvoř `middleware.ts` v **rootu projektu**, ne v `app/`. `cookieConfig.maxAge` je pro PWA zásadní — bez něj je session cookie a uživatel je po každém zavření appky odhlášený:

```ts
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(undefined, {
  cookieConfig: { maxAge: 60 * 60 * 24 * 30 }, // 30 dní, jinak se odhlásí při zavření appky
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

Ochrana konkrétních routes přijde v Tasku 4, až budou existovat stránky, kam přesměrovávat.

- [ ] **Step 10: Zapoj Convex providery**

Vytvoř `app/ConvexClientProvider.tsx`. Musí to být `ConvexAuthNextjsProvider` z `@convex-dev/auth/nextjs` — použití `ConvexAuthProvider` z `@convex-dev/auth/react` je nejčastější příčina toho, že middleware vidí uživatele jako nepřihlášeného, protože se nikdy nenastaví cookies:

```tsx
"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
```

Uprav `app/layout.tsx` — `ConvexAuthNextjsServerProvider` je async Server Component a musí obalovat `<html>`:

```tsx
import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splitee",
  description: "Výdaje v partě bez dohadování",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Splitee", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="cs">
        <body className="bg-white text-black antialiased">
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <RegisterServiceWorker />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

- [ ] **Step 11: Ověř přihlášení v prohlížeči**

Nahraď `app/page.tsx`:

```tsx
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { t } from "@/lib/i18n";

function Viewer() {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  return (
    <div className="p-8">
      <p className="text-lg">Přihlášen jako {viewer?.name ?? "…"}</p>
      <button onClick={() => void signOut()} className="mt-4 underline">
        {t("auth.signOut")}
      </button>
    </div>
  );
}

export default function Home() {
  const { signIn } = useAuthActions();
  return (
    <main className="min-h-dvh">
      <AuthLoading>
        <p className="p-8">Načítám…</p>
      </AuthLoading>
      <Unauthenticated>
        <div className="p-8">
          <h1 className="text-3xl font-semibold">{t("app.name")}</h1>
          <p className="mt-2 text-neutral-600">{t("app.tagline")}</p>
          <button
            onClick={() => void signIn("google")}
            className="mt-6 rounded-full bg-black px-6 py-3 text-white"
          >
            {t("auth.signIn")}
          </button>
        </div>
      </Unauthenticated>
      <Authenticated>
        <Viewer />
      </Authenticated>
    </main>
  );
}
```

Run: `npm run dev`, otevři `http://localhost:3000`, klikni na přihlášení
Expected: proběhne Google flow, vrátí se zpět a zobrazí „Přihlášen jako <tvoje jméno>". V Convex dashboardu → Data → `users` je nový řádek s vyplněným `accentColor`.

Když middleware tvrdí, že uživatel není přihlášený: zkontroluj, že `convex/auth.ts` exportuje `isAuthenticated` a že v `ConvexClientProvider` je opravdu `ConvexAuthNextjsProvider`.

- [ ] **Step 12: Commit**

```bash
git add convex middleware.ts app/ConvexClientProvider.tsx app/layout.tsx app/page.tsx
git commit -m "feat: Convex schéma a přihlášení Googlem"
```

---
