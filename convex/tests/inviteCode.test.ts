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
});
