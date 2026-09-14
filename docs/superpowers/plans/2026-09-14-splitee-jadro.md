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
