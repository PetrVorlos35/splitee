---
version: 1
slug: "app-g-groupid-page-tsx"
primary_target: "app/g/[groupId]/page.tsx"
related_targets: ["app/page.tsx"]
---

# Splitee — celá mobilní appka (Operate)

Scope: všechny obrazovky (/, onboarding, /join, /g/[groupId], nastavení party, /me), mobil only. Mode: Operate.
Úkol: zapsat výdaj za pár vteřin, vidět kdo komu dluží, vyrovnat jedním ťuknutím, přidávat hosty bez účtu a převzít hosta při vstupu.

## Direction contract

THESIS: Každý výdaj je vyplněný tiskopis, každý dluh ústřižek poštovní poukázky s perforací; vyrovnat = odtrhnout ústřižek. Odmítá standardní bílé karty se zeleno-červenou bilancí a plovoucím kulatým plusem.

OWN-WORLD: Chladně bledý tiskopisný podklad #F3F6F8, bílé „archy“ s tenkými linkami v jedné tiskové modři #1F3A93, text inkoust #15181C. Popisky polí drobné verzálky s prostrkáním, částky v tabulkových číslicích (u hero bilance v políčkách na číslice), perforace jako tečkovaná linka s půlkruhovými výseky. Barvy členů jen jako identita (tečka/avatar). Vyrovnané = přeškrtnuté vlasovou linkou, ne šedá/zelená.

STORY: Otevřu partu, hned vidím svou bilanci; ťuknu na dluh, vidím z jakých výdajů je, a jedním tahem ho vyrovnám; dole pod palcem je vždy „Přidat výdaj“. Hosté vypadají jako členové s čárkovaným okrajem.

FIRST VIEWPORT: Nahoře tenká lišta s přepínačem party (emoji + název) a avatarem profilu. Pod ní arch „Tvoje bilance“: velká částka v políčkách na číslice, podtitul Dlužíš/Dluží ti, řada avatarů členů. Pod ním ústřižky dluhů. Dole přilepený plný pruh „Přidat výdaj“ v tiskové modři přes celou šířku nad safe-area.

FORM: Složenka (česká poštovní poukázka), pozice 4 z vlastního seznamu, seed key 57cc8683. Raises: živý náhled podílů (Temná komora), stav čarou (Emisní čáry), okamžitá odezva (Konzole), Zpět u smazání/vyrovnání (Origami), dluh rozklikatelný na výdaje (Tensegrita).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
