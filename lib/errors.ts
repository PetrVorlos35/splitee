import { ConvexError } from "convex/values";
import { t } from "./i18n";

/**
 * Stabilní, strojově čitelné kódy chyb, které backend posílá přes
 * ConvexError. Convex v produkci maže text obyčejných `Error` zpráv na
 * "Server Error" — jen `ConvexError.data` se doručí klientovi beze změny.
 * Server proto nikdy neposílá českou větu, jen kód odsud; UI si větu
 * dohledá přes `errorMessage()` a `t()` (klíče "error.*" v lib/i18n.ts).
 */
export const ERROR = {
  NOT_SIGNED_IN: "NOT_SIGNED_IN",
  NOT_ONBOARDED: "NOT_ONBOARDED",
  NOT_MEMBER: "NOT_MEMBER",
  NICKNAME_EMPTY: "NICKNAME_EMPTY",
  NICKNAME_TOO_LONG: "NICKNAME_TOO_LONG",
  UNKNOWN_ACCENT: "UNKNOWN_ACCENT",
} as const;

export type ErrorCode = (typeof ERROR)[keyof typeof ERROR];

const MESSAGE_KEY: Record<ErrorCode, string> = {
  NOT_SIGNED_IN: "error.notSignedIn",
  NOT_ONBOARDED: "error.notOnboarded",
  NOT_MEMBER: "error.notMember",
  NICKNAME_EMPTY: "error.nicknameEmpty",
  NICKNAME_TOO_LONG: "error.nicknameTooLong",
  UNKNOWN_ACCENT: "error.unknownAccent",
};

function isErrorData(data: unknown): data is { code: string; [key: string]: unknown } {
  return typeof data === "object" && data !== null && typeof (data as { code?: unknown }).code === "string";
}

/**
 * Vytáhne kód z `ConvexError` a přeloží ho do češtiny. Na cokoli jiného —
 * síťovou chybu, neznámý kód — vrátí obecnou hlášku, aby uživatel nikdy
 * neviděl syrový `e.message`.
 */
export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError && isErrorData(e.data)) {
    const { code, ...vars } = e.data;
    const key = MESSAGE_KEY[code as ErrorCode];
    if (key) return t(key, vars as Record<string, string | number>);
  }
  return t("common.saveFailed");
}
