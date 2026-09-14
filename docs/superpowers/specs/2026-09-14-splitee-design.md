# Splitee — návrh

Datum: 2026-09-14
Stav: schváleno k implementaci

## 1. Cíl

PWA pro sledování a dělení výdajů v malé partě (max 10 lidí). Primárně mobil,
instalovatelná na plochu. Přihlášení pouze přes Google. Uživatel si v onboardingu
zvolí přezdívku a osobní barvu, založí partu nebo se připojí kódem, a pak parta
loguje výdaje — ručně nebo vyfocením účtenky. Aplikace ukazuje, kdo kolik utratil,
kdo komu kolik dluží, a co už je vyrovnané.

Doména: `splitee.dejny.eu`, běh na VPS (130.61.122.142) v Dockeru.

## 2. Stack

| Vrstva | Volba | Důvod |
|---|---|---|
| Frontend | Next.js 15 App Router, TypeScript | odpovídá zbytku ekosystému (najdispoluzakavs, vps-dashboard) |
| Styl | Tailwind CSS v4 | |
| Animace | Motion (framer-motion) | mikroanimace, spring přechody |
| Data + realtime | Convex Cloud | reaktivní queries — nový výdaj se všem propíše bez refreshe a bez polling kódu |
| Auth | Convex Auth, provider Google | jediná přihlašovací cesta, bez hesel |
| Obrázky | Cloudinary (existující účet z Tankuy, složka `splitee/receipts`) | |
| OCR | OpenAI vision (`gpt-4o`) | ověřený flow z `Tankuy/server/src/routes/receipts.js` |
| Grafy | vlastní SVG donut | plná kontrola nad animací a barvami, žádná knihovní omezení |
| Testy | vitest + convex-test | |

Realtime je záměrná součást produktu, ne optimalizace: parta zadává výdaje
současně a bilance musí sedět okamžitě.

## 3. Datový model (Convex)

**Všechny částky jsou integery v haléřích.** U dělení rovným dílem jinak vznikají
chybějící koruny a součet podílů nesedí na částku výdaje.

### users
Rozšíření tabulky z Convex Auth.

| pole | typ | poznámka |
|---|---|---|
| name, email, image | string | z Google |
| nickname | string | z onboardingu, zobrazuje se všude místo jména |
| accentColor | string | hex, akcent aplikace, per uživatel |
| locale | string | `cs`, připraveno na další |

### groups

| pole | typ | poznámka |
|---|---|---|
| name | string | |
| emoji | string | vizuální identita party v přepínači |
| currency | string | ISO kód, default `CZK`, na úrovni party |
| inviteCode | string | 6 znaků, unikátní index |
| ownerId | Id\<users\> | zakladatel = správce |
| createdAt | number | |
| archivedAt | number? | archivovaná parta zmizí z přepínače, data zůstanou |

Index: `by_inviteCode`.

### memberships

| pole | typ | poznámka |
|---|---|---|
| groupId, userId | Id | |
| color | string | **osobní barva člena v rámci party** — nese identitu v koláči, feedu i dluzích |
| role | `"owner" \| "member"` | |
| joinedAt | number | určuje deterministické pořadí při dělení zbytkových haléřů |

Indexy: `by_group`, `by_user`, `by_group_user`.

Limit 10 členů se vynucuje **v mutaci**, ne jen v UI.

### categories

| pole | typ | poznámka |
|---|---|---|
| groupId | Id\<groups\>? | `null` = výchozí kategorie dostupné všem |
| name, icon, color | string | |
| order | number | |

Výchozí sada: Jídlo, Potraviny, Doprava, Bydlení, Zábava, Nákupy, Ostatní.

### expenses

| pole | typ | poznámka |
|---|---|---|
| groupId | Id | |
| payerId | Id\<users\> | kdo reálně zaplatil |
| amount | number | haléře |
| title | string | |
| note | string? | |
| categoryId | Id\<categories\> | |
| spentAt | number | **datum útraty**, ne datum zadání — u účtenky se bere z OCR |
| createdBy, createdAt | | |
| receiptImageUrl, receiptPublicId | string? | Cloudinary |
| splitMode | `"equal" \| "exact" \| "shares"` | |
| source | `"manual" \| "receipt" \| "recurring"` | |
| recurringId | Id\<recurringExpenses\>? | |

Indexy: `by_group_spentAt`, `by_group_category`, `by_group_payer`.

### splits
Jeden řádek na účastníka výdaje.

| pole | typ | poznámka |
|---|---|---|
| expenseId, groupId, userId | Id | denormalizovaný `groupId` kvůli dotazům na dluhy |
| amount | number | haléře |
| weight | number? | jen u `splitMode: "shares"` |
| settled | boolean | **tohle je „co je zaplaceno a co ne"** |
| settledAt | number? | |
| settlementId | Id\<settlements\>? | |

Indexy: `by_expense`, `by_group_user_settled`.

Podíl samotného plátce vzniká rovnou se `settled: true` — sám sobě nedluží.

### settlements

| pole | typ | poznámka |
|---|---|---|
| groupId, fromUserId, toUserId | Id | |
| amount | number | součet vyrovnaných podílů |
| note | string? | |
| createdBy, createdAt | | |

Index: `by_group`.

### recurringExpenses

| pole | typ | poznámka |
|---|---|---|
| groupId, payerId, categoryId | Id | |
| title, amount, splitMode | | šablona výdaje |
| participants | array | userId + weight |
| interval | `"weekly" \| "monthly"` | |
| dayOfMonth / dayOfWeek | number | |
| nextRunAt | number | |
| active | boolean | |

Convex cron běží jednou denně, založí splatné výdaje se `source: "recurring"`
a posune `nextRunAt`.

### pushSubscriptions (fáze 5)
`userId`, `endpoint`, `keys`, `createdAt`.

## 4. Business pravidla

### Dělení částky

Vždy platí `Σ splits.amount === expense.amount`.

- **equal** — `base = floor(amount / n)`, zbytek `r = amount - base*n` se rozdá
  prvním `r` účastníkům seřazeným podle `membership.joinedAt`. Deterministické,
  takže opakovaný přepočet dá stejný výsledek.
- **exact** — uživatel zadá částky ručně; mutace odmítne uložení, pokud součet
  nesedí na `amount`.
- **shares** — váhy `w_i`, `amount_i = floor(amount * w_i / Σw)`, zbytkové haléře
  metodou největšího zbytku, při shodě rozhoduje `joinedAt`.

### Dluhy

Aktivní dluh se počítá z nevyrovnaných podílů, ne z abstraktní bilance:

```
dluh(A → B) = Σ splits{ userId: A, settled: false, expense.payerId: B }
```

Díky tomu je u každé položky vidět, kdo a za co ještě dluží.

### Vyrovnání

- Odkliknutí jednotlivého podílu → `settled: true`, `settledAt`.
- **„Vyrovnat vše s X"** → všechny nevyrovnané podíly X vůči mně se označí
  jedním zápisem, vznikne `settlement` se součtem a datem, podíly na něj
  odkazují přes `settlementId`.
- Částečné vyrovnání libovolnou částkou v první verzi není.

### Invite kód

6 znaků z abecedy bez zaměnitelných znaků (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` —
bez 0/O a 1/I/L). Při kolizi se generuje znovu, max 5 pokusů. Sdílí se jako kód,
odkaz `/join/[code]` i QR.

### Barvy členů

Paleta ~12 dostatečně odlišitelných odstínů s ověřeným kontrastem. Při vstupu do
party se přidělí první volná, člen si ji může změnit na jinou volnou. Dva členové
jedné party nikdy nemají stejnou barvu.

## 5. Obrazovky

| Cesta | Obsah |
|---|---|
| `/` | nepřihlášený: landing s Google tlačítkem; přihlášený: redirect na poslední partu |
| `/onboarding` | přezdívka, osobní barva, pak Založit partu / Připojit se kódem |
| `/join/[code]` | vstup do party z odkazu nebo QR |
| `/g/[groupId]` | hlavní obrazovka (níže) |
| `/g/[groupId]/add` | nový výdaj — Účtenka / Ručně |
| `/g/[groupId]/history` | filtry podle období, kategorie, osoby a stavu + hledání v názvech a poznámkách |
| `/g/[groupId]/stats` | útrata v čase po týdnech/měsících, podle osob a kategorií |
| `/g/[groupId]/settings` | členové, invite kód a QR, kategorie, opakované výdaje, CSV export, měna, archivace |
| `/me` | přezdívka, avatar, akcent aplikace |

### Hlavní obrazovka

Shora dolů:

1. **Header** s přepínačem party (emoji + název) a avatarem.
2. **Koláč** — segmenty v osobních barvách členů, uprostřed celková částka.
   Segmentovaný přepínač **Vše / Já / Ostatní**:
   - *Vše* — segment na člena = **součet jeho podílů** (kolik reálně prošlo na
     něj), uprostřed celková útrata party
   - *Já* — moje podíly rozdělené podle kategorií, uprostřed moje útrata
   - *Ostatní* — parta bez mě, uprostřed jejich útrata
   Nad koláčem přepínač období: **Tento měsíc / Minulý / Vše**, default tento měsíc.
   Období filtruje koláč i feed výdajů. **Dluhy období neřeší** — nevyrovnaný
   podíl z minulého měsíce je pořád dluh, takže sekce „Kdo komu kolik" počítá
   vždy přes celou historii party.
3. **Kdo komu kolik** — karty v barvě dlužníka, „Petr ti dluží 340 Kč" /
   „Dlužíš Janě 120 Kč", každá s tlačítkem Vyrovnat.
4. **Feed výdajů** — stejné barvy jako v koláči: barevný pruh a avatar plátce,
   ikona kategorie, název, částka, stav zaplacení, datum. Rozkliknutím se
   rozbalí, kdo se skládal a kolik.
5. **FAB** vpravo dole, rozvine se do volby Účtenka / Ručně.

Vše podstatné je dohledatelné z hlavní stránky; historie a statistiky jsou
rozšíření, ne nutná zastávka.

## 6. Účtenky

1. Uživatel vyfotí účtenku (`capture="environment"`) nebo vybere z galerie.
2. `POST /api/receipts/scan` na Next serveru: ověří Convex identitu z hlavičky,
   převede HEIC z iPhonu na JPEG, nahraje do Cloudinary.
3. Obrázek jde do OpenAI vision, odpověď se vynutí jako JSON:
   `{ merchant, totalAmount, date, categoryHint }`.
4. Vrátí se klientovi, který **předvyplní formulář k potvrzení**. Nikdy se nic
   neuloží automaticky — OCR se plete a tiché uložení špatné částky je horší než
   ruční zadání.
5. Při selhání scanu spadne uživatel do ručního formuláře s už připnutou fotkou.

Klíče k OpenAI a Cloudinary zůstávají v `.env` na VPS, klient je nikdy nevidí.

## 7. Vzhled a interakce

Light mode, bílé pozadí, černá typografie, tabulární číslice u částek. Barva
nese význam — identitu člověka — a nepoužívá se dekorativně. Uživatelský akcent
ovlivňuje tlačítka, FAB a aktivní stavy.

Layout je záměrně nesymetrický: bento mřížka, kde koláč drží dominantní kartu,
vedle ní úzký sloupec s vlastní bilancí, karty mají různé výšky a offsety.

Mikroanimace: dokreslování koláče při načtení, odpočítávání čísel nahoru,
staggered nástup položek feedu, spring přechody mezi stavy, morphing FAB do
formuláře, haptika přes Vibration API, pull-to-refresh.

## 8. Testy

Unit testy (vitest + convex-test) na to, co se reálně rozbije:

- zaokrouhlování haléřů u `equal` — součet podílů vždy rovný částce
- `exact` odmítne nesedící součet
- `shares` metodou největšího zbytku
- výpočet dluhů mezi dvojicemi
- „Vyrovnat vše" označí právě ty správné podíly a založí settlement
- strop 10 členů
- generování a kolize invite kódu

UI se ověřuje ručně na mobilu.

## 9. Nasazení

- A záznam `splitee.dejny.eu` → 130.61.122.142 v Cloudflare (wildcard `*.dejny.eu`
  míří na Vercel, proto explicitní záznam)
- nginx reverse proxy + certbot
- `deploy.sh` podle vzoru `vps-dashboard/deploy.sh`: rsync, `docker build`,
  `docker run --restart unless-stopped`, healthcheck
- Kontejner poslouchá na `3011`; pokud je port na VPS obsazený, vezme se první
  volný nad ním a promítne se do nginx configu

### Proměnné prostředí

Next server (`.env` na VPS):
```
NEXT_PUBLIC_CONVEX_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENAI_API_KEY=
SITE_URL=https://splitee.dejny.eu
```

Convex prostředí:
```
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
SITE_URL=https://splitee.dejny.eu
```

## 10. Pořadí prací

1. Skeleton, PWA manifest a service worker, Google login, onboarding
   (přezdívka + barva), party, invite kód a QR
2. Výdaje, tři režimy dělení, koláč, dluhy, vyrovnání → **nasazení na
   splitee.dejny.eu**
3. OCR účtenek
4. Historie s filtry a hledáním, statistiky v čase, opakované výdaje, CSV export
5. Push notifikace (VAPID, stejný postup jako tankuy/beno)

## 11. Mimo rozsah první verze

- přepočty mezi měnami (parta má jednu měnu)
- položkové dělení účtenky (kdo si co dal)
- dark mode
- e-mailové notifikace
- offline zápis výdajů — service worker cachuje jen shell, zápis vyžaduje síť
