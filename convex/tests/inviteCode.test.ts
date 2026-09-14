import { describe, expect, it } from "vitest";
import { INVITE_ALPHABET, generateInviteCode } from "../lib/inviteCode";

describe("generateInviteCode", () => {
  it("má šest znaků", () => {
    expect(generateInviteCode()).toHaveLength(6);
  });

  it("používá jen znaky z abecedy bez zaměnitelných", () => {
    for (let i = 0; i < 200; i++) {
      for (const ch of generateInviteCode()) {
        expect(INVITE_ALPHABET).toContain(ch);
      }
    }
  });

  it("neobsahuje nulu, O, jedničku, I ani L", () => {
    expect(INVITE_ALPHABET).not.toMatch(/[0O1IL]/);
  });

  it("je deterministický, když mu dáš vlastní generátor", () => {
    const rng = () => 0;
    expect(generateInviteCode(rng)).toBe(INVITE_ALPHABET[0].repeat(6));
  });

  it("rozložení znaků z výchozího (kryptografického) generátoru není hrubě zkreslené", () => {
    const counts = new Map<string, number>();
    for (const ch of INVITE_ALPHABET) counts.set(ch, 0);

    const codes = 2000;
    for (let i = 0; i < codes; i++) {
      for (const ch of generateInviteCode()) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1);
      }
    }

    const totalDraws = [...counts.values()].reduce((s, c) => s + c, 0);
    const expected = totalDraws / INVITE_ALPHABET.length;

    // volná hranice (0,5×–1,5× očekávaného počtu) — chytí hrubé zkreslení
    // (např. znovu zavedené modulo zkreslení bajtů), ne statistický šum.
    for (const [ch, count] of counts) {
      expect(count, `znak "${ch}" má podezřele nerovnoměrný počet výskytů (${count})`).toBeGreaterThan(
        expected * 0.5,
      );
      expect(count, `znak "${ch}" má podezřele nerovnoměrný počet výskytů (${count})`).toBeLessThan(
        expected * 1.5,
      );
    }
  });
});
