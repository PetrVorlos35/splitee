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
