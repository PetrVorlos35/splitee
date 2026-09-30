---
name: Splitee
description: Výdaje v partě bez dohadování — mobilní tiskopis, kde je každý dluh ústřižek poštovní poukázky.
colors:
  paper: "#f3f6f8"
  sheet: "#ffffff"
  ink: "#15181c"
  ink-2: "#4b5569"
  ink-3: "#6f7a8e"
  rule: "#c9d3e8"
  rule-soft: "#e3e8f3"
  form: "#1f3a93"
  form-ink: "#ffffff"
  form-soft: "#e5eaf6"
  form-deep: "#172c70"
  owe: "#a8321f"
  owe-soft: "#f8e9e6"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"ss01\", \"cv11\""
  meta:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.08em"
  amount:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.125rem"
    fontWeight: 500
    fontFeature: "\"tnum\""
  amount-hero:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.75rem"
    fontWeight: 500
    fontFeature: "\"tnum\""
rounded:
  slip: "4px"
  control: "6px"
  drawer: "20px"
  full: "9999px"
spacing:
  hair: "2px"
  stack: "8px"
  row: "14px"
  page: "16px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.form}"
    textColor: "{colors.form-ink}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  button-primary-active:
    backgroundColor: "{colors.form-deep}"
    textColor: "{colors.form-ink}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "52px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.form}"
    rounded: "{rounded.control}"
    height: "36px"
  button-quiet-active:
    backgroundColor: "{colors.form-soft}"
    textColor: "{colors.form}"
  button-danger:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.owe}"
    rounded: "{rounded.control}"
  add-bar:
    backgroundColor: "{colors.form}"
    textColor: "{colors.form-ink}"
    rounded: "0px"
    width: "100%"
    padding: "16px 0"
  slip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slip}"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px 10px"
  digit-box:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.amount-hero}"
    rounded: "0px"
    width: "34px"
    height: "48px"
  error-line:
    backgroundColor: "{colors.owe-soft}"
    textColor: "{colors.owe}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: Splitee

## Overview

**Creative North Star: "Složenka"**

Splitee je česká poštovní poukázka přenesená do telefonu. Každý výdaj je vyplněný řádek tiskopisu, každý dluh je ústřižek s perforací a vyrovnat znamená ústřižek odtrhnout. Podklad je chladně bledý tiskopisný papír, na něm leží bílé archy orámované tenkou linkou jediné tiskové modři; text je téměř černý inkoust. Nic nesvítí, nic se nevznáší. Vzhled je nástroj, ne hračka: klid, čísla a přehlednost.

Hustota je hustota formuláře: řádky vysoké 64 px, drobné verzálkové popisky polí, částky v tabulkových číslicích mono písma. Barva nese jen dvě věci: tisková modř je hlas tiskopisu (linky, akce, perforace), barvy členů jsou identita osob. Směr peněz se čte ze znaménka a slov („Dlužíš“, „Dluží ti“), nikdy z červené a modré.

Svět výslovně odmítá standardní bílé karty s měkkým stínem, zeleno-červenou bilanci a plovoucí kulaté plus.

**Key Characteristics:**
- Bledý podklad, bílé archy, linky v modři tiskopisu místo stínů.
- Jedna tisková modř pro všechny akce a pro perforaci.
- Částky vždy inkoustem, v Geist Mono s tabulkovými číslicemi.
- Hero bilance vepsaná do políček na číslice jako na poukázce.
- Perforace s půlkruhovými výseky odděluje tělo archu od ústřižku.
- Plný modrý pruh „Přidat výdaj“ přes celou šířku dole pod palcem.
- Kreslené ikony lucide jednou tloušťkou čáry, žádná emoji v UI kategorií.

## Colors

Chladná, téměř monochromní paleta tiskopisu: papír, inkoust a jedna tisková modř; červená jen pro chybu a zničení.

### Primary
- **Tisková modř** (form): hlas tiskopisu. Primární tlačítka, pruh „Přidat výdaj“, tiché akce („Vyrovnat“), ikony kategorií, fokusový obrys, kurzor, perforace a přeškrtnutí vyrovnaného podílu.
- **Hluboká tisková modř** (form-deep): stisknutý stav primární akce, text na světle modré výplni (tip v archu výdaje, výběr textu).
- **Světlá tisková modř** (form-soft): stisknutý stav tichých akcí, podklad výběru a informačních tipů.
- **Bílá na modři** (form-ink): text a ikony na plné modři.

### Secondary
- **Rezavá chyba** (owe): výhradně chybové hlášky, neplatné pole, destruktivní akce (smazat výdaj, odhlásit). Nikdy směr dluhu.
- **Rezavý podklad** (owe-soft): podklad chybové lišty a potvrzení smazání.

### Neutral
- **Tiskopisný papír** (paper): podklad celé appky i spodních archů; barva, kterou jsou „vyseknuté“ výseky perforace. Zároveň `themeColor` PWA.
- **Bílý arch** (sheet): archy, řádky seznamů, pole formuláře, políčka na číslice.
- **Inkoust** (ink): veškerý text a všechny částky.
- **Inkoust 2** (ink-2): podtituly, popisy, neaktivní ovládací prvky.
- **Inkoust 3** (ink-3): metadata řádků, popisky polí, měna u hero částky, zmenšující podíly.
- **Linka tiskopisu** (rule): 1px orámování archů a polí, rámečky políček na číslice, dělicí linka nad patičkou archu.
- **Jemná linka** (rule-soft): oddělovače řádků uvnitř archu, dráha přepínače, stisk ikonových tlačítek.

### Named Rules
**The Ink Amount Rule.** Částka je vždy inkoustem. Kdo komu dluží, říká znaménko (−) a slova, ne barva; červená a modrá polarita částek je zakázaná.

**The Identity-Only Rule.** Dvanáct barev členů (lib/colors.ts) je identita osoby v partě, unikátní v rámci party. Objevují se jen na avataru, vzorku výběru barvy a jeho prstenci, nikdy jako dekorace, stav ani podklad sekce.

**The One Print Blue Rule.** Interaktivní i tiskové prvky mluví jedinou modří. Druhý akcent se nezavádí.

## Typography

**Display Font:** Geist (s ui-sans-serif, system-ui)
**Body Font:** Geist (s ui-sans-serif, system-ui), zapnuté `ss01` a `cv11`
**Label/Mono Font:** Geist Mono (s ui-monospace) pro všechny částky a kódy pozvánek

**Character:** Věcný grotesk úředního tiskopisu s mono číslicemi, které sedí pod sebou na haléř. Nadpisy mají lehce stažené prostrkání, popisky polí naopak rozvolněné verzálky.

### Hierarchy
- **Display** (600, 2rem, 1.1): jediný velký titulek úvodní obrazovky pro nepřihlášené.
- **Headline** (600, 1.5rem): titulek stránky (nastavení party, profil, prázdná parta, vstup do party); onboarding 1.75rem.
- **Title** (600, 1.125rem): titulek spodního archu.
- **Section** (600, 0.9375rem): nadpisy sekcí na stránce („Kdo komu“, „Výdaje“).
- **Body** (400, 1rem / 0.9375rem): názvy výdajů, texty dluhů, vstupy (1.0625rem).
- **Meta** (400, 0.8125rem, ink-3): kdo platil, počet lidí, datum, nápověda pod polem.
- **Label** (600, 0.6875rem, 0.08em, verzálky, ink-3): popisek pole tiskopisu uvnitř rámečku Field, popisek skupiny ovládacích prvků, popisek hero archu („Tvoje bilance“) a datum dne nad archem výdajů.
- **Amount** (Geist Mono 500, tabulkové číslice): v řádku 1rem, v ústřižku dluhu 1.125rem, v políčkách hero bilance 1.75rem.

### Named Rules
**The Tabular Money Rule.** Každá částka je v Geist Mono s tabulkovými číslicemi. Proporční číslice u peněz se nepoužívají.

**The Field Label Rule.** Drobné verzálky patří jen k poli nebo skupině, kterou popisují, jako popisek na tiskopisu. Nad nadpis se jako ozdobný nadtitulek nedávají.

## Layout

Jen mobil. Obsah je jeden sloupec s maximální šířkou 32rem (max-w-lg), vodorovný okraj stránky 16px. Sekce stránky jsou od sebe 28px, ústřižky dluhů 8px, dny ve feedu 16px. Řádek výdaje má min. 64px, řádek detailu dluhu 56px, vnitřní vodorovné odsazení řádku 14px.

Nahoře lepkavá lišta vysoká 56px na papíru (95% krytí s rozmazáním) s linkou dole; vlevo přepínač party, vpravo nastavení a avatar profilu. Dole je na domovské obrazovce party přilepený pruh „Přidat výdaj“ přes celou šířku nad safe-area; obsah stránky proto končí odsazením 5.5rem + safe-area a toasty sedí nad ním. Všechny dotykové cíle mají aspoň 44px (ikonová tlačítka 44px, malá tlačítka 36px uvnitř vyššího řádku).

## Elevation & Depth

Hloubka je z linek a tónů, ne ze stínů. Arch leží na papíře díky bílé výplni a 1px lince tiskové modři, řádky uvnitř dělí jemná linka. Jediné vrstvení s měkkým stínem je modální: spodní arch nad ztmavením inkoustu 30% a toast.

### Shadow Vocabulary
- **Linka archu** (`box-shadow: 0 0 0 1px var(--color-rule)`): obrys každého archu na papíře místo stínu.
- **Spodní arch** (`box-shadow: 0 -12px 40px -12px rgb(21 24 28 / 0.35)`): jen modální spodní arch nad ztmavenou stránkou.

### Named Rules
**The Ruled Not Lifted Rule.** Archy na stránce nemají měkký stín; odlišuje je bílá výplň a 1px linka. Stín patří jen vrstvám, které stránku překrývají.

## Shapes

Tiskopis je skoro pravoúhlý. Archy a ústřižky mají roh 4px, ovládací prvky (tlačítka, pole, dlaždice, přepínač) 6px, políčka na číslice 0px a na sebe navazují o překrytý 1px okraj. Kulaté jsou jen avatary, vzorky barev, ikonová tlačítka v liště a úchyt archu. Modální spodní arch má nahoře roh 20px jako systémová zásuvka telefonu.

**Perforace** je opakovaný tvar světa: tečkovaná linka tiskové modři (tečka 1px, rozestup 8px, krytí 45%) a na jejích koncích půlkruhové výseky o průměru 12px vyplněné barvou papíru, s vnitřní linkou podél řezu. U ústřižku dluhu je perforace svislá tečkovaná linka se dvěma výseky nahoře a dole.

**Čárkovaný okraj** znamená „zatím nevyplněné“: host má avatar s bílou výplní a čárkovaným 1.5px okrajem ve své barvě; prázdné stavy jsou archy s čárkovanou linkou.

## Components

### Buttons
Okamžitá odezva bez pružin, stisk je krátké zmáčknutí.
- **Shape:** mírně zaoblené (6px), výšky 52 / 44 / 36px.
- **Primary:** plná tisková modř, bílý text 600, stisk přejde do hluboké modři a zmenší se na 98% za 100ms; neaktivní 40% krytí modři.
- **Secondary:** bílý arch s linkou tiskopisu, inkoust; stisk papír.
- **Quiet:** bez výplně, text tiskovou modří, stisk světlou modří. Tak vypadá „Vyrovnat“ na ústřižku.
- **Danger:** bílý arch, rezavý text a rezavá linka 30%; stisk rezavým podkladem.
- **Focus:** globální obrys 2px tiskovou modří s odsazením 2px.

### Add Bar (signature)
Plný pruh tiskové modři přes celou šířku přilepený ke spodku obrazovky, ikona plus (tah 2.4) a „Přidat výdaj“ 1rem 600, odsazení 16px nahoře a max(16px, safe-area) dole. Bez rohů a bez stínu. Stisk hluboká modř.

### Cards / Containers (archy)
- **Corner Style:** 4px.
- **Background:** bílý arch na papíře.
- **Shadow Strategy:** linka archu (viz Elevation & Depth).
- **Border:** 1px linka tiskopisu, řádky uvnitř dělí jemná linka.
- **Internal Padding:** 14–16px.

### Debt Slip (signature)
Ústřižek dluhu: vlevo dva avatary (30px) se šipkou, text „Dlužíš Petrovi“ a částka inkoustem v mono; za svislou perforací vpravo tichá akce „Vyrovnat“. Klepnutí na tělo otevře detail s podíly, ze kterých dluh vznikl. Vyrovnaný ústřižek se „odtrhne“: odjede o 72px doprava, pootočí se o 2.5° a zmizí (260ms), toast nabídne Zpět.

### Balance Slip + Digit Boxes (signature)
Hlavní arch domovské obrazovky. Popisek pole „Tvoje bilance“, částka vepsaná do políček na číslice (každá číslice v bílém rámečku 34×48px s linkou tiskopisu, oddělovače stojí volně), vedle měna v inkoustu 3. Pod ní věta „Dlužíš / Dluží ti / Jsi vyrovnaný“. Vodorovná perforace s výseky odděluje dolní ústřižek s řadou avatarů členů a akcemi přidat hosta a pozvat.

### Expense Row
Řádek tiskopisu: ikonová dlaždice 40px s rohem 4px a linkou, uvnitř kreslená ikona kategorie tiskovou modří; název, meta „kdo platil · kolik lidí“, vpravo částka inkoustem a pod ní tvůj podíl. **Vyrovnaný podíl** je přeškrtnutý 1px vlasovou linkou tiskové modři, zůstává inkoustem, nešedne ani nezezelená.

### Inputs / Fields
- **Style:** rámeček tiskopisu: bílý arch, 1px linka, roh 6px, uvnitř nahoře popisek pole ve verzálkách, pod ním holý vstup 1.0625rem. Celý rámeček je label, klepnutí kamkoli zaměří vstup.
- **Focus:** linka rámečku přejde do tiskové modři; kurzor tiskovou modří.
- **Error:** linka rezavá a pod polem rezavá hláška; souhrnná chyba je rezavá lišta s rohem 6px.

### Chips / Segmented
- **Segmented:** dráha jemné linky s rohem 6px, aktivní volba bílý arch s inkoustem, neaktivní inkoust 2.
- **Category chips:** výška 40px, roh 4px, linka tiskopisu; zvolený stav tiskovou modří.

### Avatar
Identita člena: plná výplň jeho barvy s iniciálou (text bílý nebo inkoust podle kontrastu), fotka s 2px bílým a 1.5px barevným prstencem. Host: bílá výplň, iniciála a 1.5px čárkovaný okraj v jeho barvě.

### Navigation
Lepkavá horní lišta na papíře s linkou dole. Přepínač party = emoji dlaždice + název (1.0625rem 600) otevírá spodní arch. Ikony nastavení a profilu jsou kulaté 44px cíle, stisk jemnou linkou. Podstránky mají vlevo „zpět“ tiskovou modří.

### Sheet (spodní arch)
Modální zásuvka na papíře s rohem 20px nahoře, úchytem a titulkem; obsah se posouvá, hlavní akce sedí v patičce oddělené linkou tiskopisu nad safe-area. Vjede zdola za 280ms s křivkou `cubic-bezier(0.16, 1, 0.3, 1)`, stáhnout jde jen za úchyt.

### Toast
Inkoustová lišta nad pruhem přidání, 5 s, s volitelnou akcí Zpět; každé vyrovnání a smazání ji nabízí.

## Do's and Don'ts

### Do:
- **Do** kreslit hloubku linkou: arch = bílá výplň + 1px linka tiskopisu (rule), roh 4px.
- **Do** psát každou částku inkoustem v Geist Mono s tabulkovými číslicemi; směr nese znaménko a slova.
- **Do** označit vyrovnané přeškrtnutím 1px vlasovou linkou tiskové modři.
- **Do** oddělovat tělo archu a ústřižek perforací s půlkruhovými výseky barvy papíru.
- **Do** používat kreslené ikony lucide jednou tloušťkou čáry (1.8–2) tiskovou modří nebo inkoustem 2.
- **Do** ukázat hosta jako avatar s bílou výplní a čárkovaným okrajem ve své barvě.
- **Do** nabídnout Zpět v toastu po každém vyrovnání a smazání.

### Don't:
- **Don't** barvit částky nebo bilanci červeně/zeleně či červeně/modře podle směru dluhu.
- **Don't** dávat archům na stránce měkký stín; stín mají jen modální vrstvy.
- **Don't** používat barvy členů jako dekoraci, podklad sekce nebo stavovou barvu.
- **Don't** přidávat plovoucí kulaté plus; hlavní akce je pruh přes celou šířku.
- **Don't** značit vyrovnané šedou ani zelenou.
- **Don't** zavádět druhý akcent vedle tiskové modři; rezavá patří jen chybám a zničení.
- **Don't** dávat drobné verzálky nad nadpis jako nadtitulek; patří jen k poli nebo skupině.
