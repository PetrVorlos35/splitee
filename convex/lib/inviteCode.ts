/** Bez 0/O a 1/I/L — kód se opisuje z displeje, záměna by lidi zdržovala. */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 6;

/**
 * Bezpečný výběr indexu 0..INVITE_ALPHABET.length-1 z crypto.getRandomValues,
 * bez modulo zkreslení. 256 % 31 = 8, takže naivní `byte % 31` by zvýhodnilo
 * prvních 8 znaků abecedy asi o 3 %. Rejection sampling zahodí bajty z
 * přebývajícího pásma [248, 255] a losuje znovu, dokud nepadne bajt z pásma
 * [0, 247], které je 31 rozdělitelné rovnoměrně.
 *
 * Vrací zlomek uprostřed "koše" daného indexu (ne index/max, ale (index+0.5)/max),
 * aby Math.floor(rng() * INVITE_ALPHABET.length) v generateInviteCode spolehlivě
 * vrátil zpátky stejný index i přes zaokrouhlení plovoucí desetinné čárky.
 */
function secureAlphabetFraction(): number {
  const max = INVITE_ALPHABET.length;
  const limit = 256 - (256 % max);
  let byte: number;
  do {
    byte = crypto.getRandomValues(new Uint8Array(1))[0];
  } while (byte >= limit);
  return ((byte % max) + 0.5) / max;
}

export function generateInviteCode(rng: () => number = secureAlphabetFraction): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_ALPHABET[Math.floor(rng() * INVITE_ALPHABET.length)];
  }
  return code;
}
