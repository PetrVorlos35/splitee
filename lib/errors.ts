import { t } from "./i18n";

/**
 * Stabilní, strojově čitelné kódy chyb, které backend posílá přes
 * ConvexError. Convex v produkci maže text obyčejných `Error` zpráv na
 * "Server Error" — jen `ConvexError.data` se doručí klientovi beze změny.
 * Server proto nikdy neposílá českou větu, jen kód odsud; UI si větu
 * dohledá přes `errorMessage()` a `t()` (klíče "error.*" v lib/i18n.ts).
 *
 * Jedna slovní zásoba pro celou appku — auth/profil (Task 4), party/
 * pozvánky (Task 5) i výdaje (Task 6) sahají po stejných jménech, ne po
 * synonymech (výdaje např. znovu použijí NOT_MEMBER, nevymýšlí si vlastní
 * "EXPENSE_NOT_MEMBER"). Až bude mít vlastní ConvexError kód další modul
 * (dluhy...), přidá se sem, ne do lokální kopie.
 */
export const ERROR = {
  NOT_SIGNED_IN: "NOT_SIGNED_IN",
  NOT_ONBOARDED: "NOT_ONBOARDED",
  NOT_MEMBER: "NOT_MEMBER",
  NICKNAME_EMPTY: "NICKNAME_EMPTY",
  NICKNAME_TOO_LONG: "NICKNAME_TOO_LONG",
  UNKNOWN_ACCENT: "UNKNOWN_ACCENT",
  GROUP_NAME_EMPTY: "GROUP_NAME_EMPTY",
  INVITE_CODE_EXHAUSTED: "INVITE_CODE_EXHAUSTED",
  INVITE_CODE_INVALID: "INVITE_CODE_INVALID",
  GROUP_FULL: "GROUP_FULL",
  GROUP_NOT_FOUND: "GROUP_NOT_FOUND",
  UNKNOWN_COLOR: "UNKNOWN_COLOR",
  COLORS_EXHAUSTED: "COLORS_EXHAUSTED",
  // Task 6 — convex/lib/split.ts (poskládání podílů)
  AMOUNT_INVALID: "AMOUNT_INVALID",
  NO_PARTICIPANTS: "NO_PARTICIPANTS",
  WEIGHT_INVALID: "WEIGHT_INVALID",
  SPLIT_AMOUNT_INVALID: "SPLIT_AMOUNT_INVALID",
  SPLIT_SUM_MISMATCH: "SPLIT_SUM_MISMATCH",
  // Task 6 — convex/lib/money.ts (parseAmount)
  AMOUNT_FORMAT_INVALID: "AMOUNT_FORMAT_INVALID",
  AMOUNT_NOT_POSITIVE: "AMOUNT_NOT_POSITIVE",
  AMOUNT_TOO_LARGE: "AMOUNT_TOO_LARGE",
  // Task 6 — convex/expenses.ts
  EXPENSE_TITLE_EMPTY: "EXPENSE_TITLE_EMPTY",
  PARTICIPANT_DUPLICATE: "PARTICIPANT_DUPLICATE",
  SPLIT_AMOUNT_MISSING: "SPLIT_AMOUNT_MISSING",
  EXPENSE_NOT_FOUND: "EXPENSE_NOT_FOUND",
  // Task 6, review round 1
  SPENT_AT_INVALID: "SPENT_AT_INVALID",
  CATEGORY_NOT_IN_GROUP: "CATEGORY_NOT_IN_GROUP",
  EXPENSE_SETTLEMENT_LOCKED: "EXPENSE_SETTLEMENT_LOCKED",
  // Task 7 — convex/settlements.ts (dluhy, vyrovnání, zrušení vyrovnání)
  DEBT_NOT_YOURS: "DEBT_NOT_YOURS",
  SETTLEMENT_NOT_FOUND: "SETTLEMENT_NOT_FOUND",
  // zjednodušené dluhy — převody (convex/settlements.ts settleTransfer)
  DEBT_CHANGED: "DEBT_CHANGED",
  SETTLEMENT_CLOSED: "SETTLEMENT_CLOSED",
  // hosté — convex/guests.ts
  GUEST_NOT_FOUND: "GUEST_NOT_FOUND",
  GUEST_HAS_ACTIVITY: "GUEST_HAS_ACTIVITY",
  ALREADY_MEMBER: "ALREADY_MEMBER",
} as const;

export type ErrorCode = (typeof ERROR)[keyof typeof ERROR];

export const MESSAGE_KEY: Record<ErrorCode, string> = {
  NOT_SIGNED_IN: "error.notSignedIn",
  NOT_ONBOARDED: "error.notOnboarded",
  NOT_MEMBER: "error.notMember",
  NICKNAME_EMPTY: "error.nicknameEmpty",
  NICKNAME_TOO_LONG: "error.nicknameTooLong",
  UNKNOWN_ACCENT: "error.unknownAccent",
  GROUP_NAME_EMPTY: "error.groupNameEmpty",
  INVITE_CODE_EXHAUSTED: "error.inviteCodeExhausted",
  INVITE_CODE_INVALID: "error.inviteCodeInvalid",
  GROUP_FULL: "error.groupFull",
  GROUP_NOT_FOUND: "error.groupNotFound",
  UNKNOWN_COLOR: "error.unknownColor",
  COLORS_EXHAUSTED: "error.colorsExhausted",
  AMOUNT_INVALID: "error.amountInvalid",
  NO_PARTICIPANTS: "error.noParticipants",
  WEIGHT_INVALID: "error.weightInvalid",
  SPLIT_AMOUNT_INVALID: "error.splitAmountInvalid",
  SPLIT_SUM_MISMATCH: "error.splitSumMismatch",
  AMOUNT_FORMAT_INVALID: "error.amountFormatInvalid",
  AMOUNT_NOT_POSITIVE: "error.amountNotPositive",
  AMOUNT_TOO_LARGE: "error.amountTooLarge",
  EXPENSE_TITLE_EMPTY: "error.expenseTitleEmpty",
  PARTICIPANT_DUPLICATE: "error.participantDuplicate",
  SPLIT_AMOUNT_MISSING: "error.splitAmountMissing",
  EXPENSE_NOT_FOUND: "error.expenseNotFound",
  SPENT_AT_INVALID: "error.spentAtInvalid",
  CATEGORY_NOT_IN_GROUP: "error.categoryNotInGroup",
  EXPENSE_SETTLEMENT_LOCKED: "error.expenseSettlementLocked",
  DEBT_NOT_YOURS: "error.debtNotYours",
  SETTLEMENT_NOT_FOUND: "error.settlementNotFound",
  DEBT_CHANGED: "error.debtChanged",
  SETTLEMENT_CLOSED: "error.settlementClosed",
  GUEST_NOT_FOUND: "error.guestNotFound",
  GUEST_HAS_ACTIVITY: "error.guestHasActivity",
  ALREADY_MEMBER: "error.alreadyMember",
};

/**
 * Duck-typing místo `e instanceof ConvexError` — `.mutation`/`.query` volání
 * přes convex-test jdou přes `invokeMutation`/`invokeQuery`, což ConvexError
 * serializuje a zpátky deserializuje (registration_impl.js), a napříč tím,
 * jak Vitest natahuje `convex/values` přes `import.meta.glob` odděleně od
 * přímého importu v testovacím souboru, `instanceof` přes tuhle hranici
 * modulového grafu neprojde, i když jde o strukturálně identickou třídu.
 * Kontrola tvaru `data.code` funguje vždy — v prohlížeči i v convex-test.
 */
function isErrorData(data: unknown): data is { code: string; [key: string]: unknown } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { code?: unknown }).code === "string"
  );
}

/** Sdílené jádro pro `errorMessage` i `hasTranslatedCode` — jedno místo, kde se z `e` duck-typuje `ConvexError.data`. */
function extractErrorData(e: unknown): { code: string; [key: string]: unknown } | undefined {
  const data = e !== null && typeof e === "object" && "data" in e ? e.data : undefined;
  return isErrorData(data) ? data : undefined;
}

/**
 * SPLIT_SUM_MISMATCH nese syrové haléře (`total`, `amount`) — `validateExact`
 * (convex/lib/split.ts) je čistá funkce bez kontextu party, natožpak měny,
 * takže currency se do ConvexError dat nedostane. Formátujeme až tady, ve
 * zobrazovací vrstvě (viz globální pravidlo "formátování na Kč patří jen
 * sem"), a napevno na CZK — jedinou měnu, kterou appka dnes reálně
 * používá. Nepoužíváme `formatAmount` z convex/lib/money.ts přímo, protože
 * ten modul importuje `ERROR` odsud — import zpátky by byl kruhový.
 */
function haleruToKc(value: unknown): string {
  const haleru = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 2,
  }).format(haleru / 100);
}

/** Kódy, jejichž proměnné nesou syrové haléře a musí projít `haleruToKc` dřív, než se dosadí do věty. */
const HALERU_VARS: Partial<Record<ErrorCode, string[]>> = {
  SPLIT_SUM_MISMATCH: ["total", "amount"],
};

/**
 * Vytáhne kód z `ConvexError` a přeloží ho do češtiny. Na cokoli jiného —
 * síťovou chybu, neznámý kód — vrátí obecnou hlášku, aby uživatel nikdy
 * neviděl syrový `e.message`.
 */
export function errorMessage(e: unknown): string {
  const data = extractErrorData(e);
  if (data) {
    const { code, ...vars } = data;
    const key = MESSAGE_KEY[code as ErrorCode];
    if (key) {
      const haleruFields = HALERU_VARS[code as ErrorCode];
      const formatted = haleruFields
        ? Object.fromEntries(
            Object.entries(vars).map(([k, v]) => [k, haleruFields.includes(k) ? haleruToKc(v) : v]),
          )
        : vars;
      return t(key, formatted as Record<string, string | number>);
    }
  }
  return t("common.saveFailed");
}

/**
 * True jen když `e` nese kód, který má překlad v `MESSAGE_KEY` — ne jen
 * když `data.code` existuje. Pro volající, kteří (na rozdíl od
 * `errorMessage`) potřebují rozlišit "known ConvexError kód, dá se z něj
 * poskládat přesná věta" od "cokoli jiného" (Convex validační chyba,
 * síťová chyba, kód, co jsme zapomněli přidat do MESSAGE_KEY) a na tu
 * druhou skupinu reagovat kontextovou hláškou, ne obecným fallbackem
 * `errorMessage` schovaným pod "Nepovedlo se uložit." — viz
 * app/g/[groupId]/error.tsx.
 */
export function hasTranslatedCode(e: unknown): boolean {
  const data = extractErrorData(e);
  return data !== undefined && data.code in MESSAGE_KEY;
}
