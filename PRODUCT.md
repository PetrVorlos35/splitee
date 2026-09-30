# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobilní PWA (instalovatelná na plochu). Navrhuje se výhradně pro telefon, desktop se neřeší.

## Users
Malá parta kamarádů (max 10 lidí) — stejně často krátkodobá akce (výlet, chata, festival: hodně výdajů za pár dní, zadávání na místě, na konci vyrovnání) jako dlouhodobé spolubydlení (pravidelné nákupy, nájem, energie, průběžné vyrovnávání). Kdokoli z party zapisuje výdaje, často ve spěchu, jednou rukou, u pokladny nebo hned po zaplacení.

## Product Purpose
Zapsat výdaj za pár vteřin, rovnou ho rozpočítat mezi lidi a kdykoli vidět, kdo komu kolik dluží. Úspěch = nikdo se o peníze nedohaduje a vyrovnání je jedno ťuknutí.

## Positioning
Realtime sdílená parta (Convex) — výdaj se všem propíše okamžitě. Do party jde přidat i lidi bez účtu (hosty), zapisovat za ně od první minuty, a když se později přihlásí, převezmou si svého hosta i s celou historií.

## Operating Context
- Přihlášení jen přes Google (Convex Auth), pak přezdívka a osobní barva.
- Parta: název, emoji, měna (CZK), 6znakový kód pozvánky, odkaz a QR.
- Výdaj: za co, kolik, kdo platil, kdo se skládá, kategorie, datum, poznámka; dělení rovným dílem, přesnými částkami nebo poměrem.
- Dluhy se počítají z konkrétních nevyrovnaných podílů, vzájemně se započítávají; vyrovnání jednotlivého podílu i hromadné s jedním člověkem, lze ho zrušit.
- Hosté: kdokoli z party může hosta přidat, zapisovat za něj platby a vyrovnávat jeho dluhy. Při vstupu do party si nový člen vybere, kterého hosta přebírá.

## Capabilities and Constraints
- Částky v haléřích (integer), formátování jen na zobrazovací vrstvě.
- Barvy členů jsou identita v rámci party (unikátní), ne dekorace.
- Oprávnění se kontroluje na serveru, nikdy jen v UI.
- UI je česky, texty přes `lib/i18n.ts`, chyby přes kódy v `lib/errors.ts`.
- Jen světlý režim.

## Brand Commitments
Název Splitee, tagline „Výdaje v partě bez dohadování“. Tón neformální, tykání. Uživatel chce vzhled čistý a klidný — spíš nástroj než hračka, důraz na čísla a přehlednost.

## Product Principles
1. Zápis výdaje musí jít rychle a jednou rukou — nejčastější akce má nejkratší cestu.
2. Na první pohled musí být jasné „kolik dlužím / kolik mi dluží“.
3. Čísla vždy sedí na haléř; žádná akce nesmí potichu ztratit nebo zdvojit peníze.
4. Nikdo nesmí být zablokovaný tím, že ostatní ještě nemají účet.

## Accessibility & Inclusion
Dotykové cíle min. 44 px, čitelný kontrast, ovládání čtečkou (role, aria-labely, focus v sheetech).
