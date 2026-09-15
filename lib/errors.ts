import { t } from "./i18n";

/**
 * Stabilní, strojově čitelné kódy chyb, které backend posílá přes
 * ConvexError. Convex v produkci maže text obyčejných `Error` zpráv na
 * "Server Error" — jen `ConvexError.data` se doručí klientovi beze změny.
 * Server proto nikdy neposílá českou větu, jen kód odsud; UI si větu
 * dohledá přes `errorMessage()` a `t()` (klíče "error.*" v lib/i18n.ts).
 *
 * Jedna slovní zásoba pro celou appku — auth/profil (Task 4) i party/
 * pozvánky (Task 5) sahají po stejných jménech, ne po synonymech. Až
 * bude mít vlastní ConvexError kód další modul (výdaje, dluhy...), přidá
 * se sem, ne do lokální kopie.
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
 * Vytáhne kód z `ConvexError` a přeloží ho do češtiny. Na cokoli jiného —
 * síťovou chybu, neznámý kód — vrátí obecnou hlášku, aby uživatel nikdy
 * neviděl syrový `e.message`.
 */
export function errorMessage(e: unknown): string {
  const data = extractErrorData(e);
  if (data) {
    const { code, ...vars } = data;
    const key = MESSAGE_KEY[code as ErrorCode];
    if (key) return t(key, vars as Record<string, string | number>);
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
