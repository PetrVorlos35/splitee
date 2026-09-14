import { describe, expect, it } from "vitest";
import { MEMBER_COLORS, colorByKey, firstFreeColor } from "./colors";

describe("MEMBER_COLORS", () => {
  it("má dvanáct barev, aby vystačily i na plnou partu", () => {
    expect(MEMBER_COLORS).toHaveLength(12);
  });

  it("nemá duplicitní klíč ani hex", () => {
    expect(new Set(MEMBER_COLORS.map((c) => c.key)).size).toBe(12);
    expect(new Set(MEMBER_COLORS.map((c) => c.hex)).size).toBe(12);
  });

  it("má všechny hexy v platném tvaru", () => {
    for (const c of MEMBER_COLORS) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("u každé barvy říká, jestli na ní má být černý nebo bílý text", () => {
    for (const c of MEMBER_COLORS) expect(["black", "white"]).toContain(c.textOn);
  });
});

describe("colorByKey", () => {
  it("najde barvu podle klíče", () => {
    expect(colorByKey("red").hex).toBe("#F25A5A");
  });

  it("u neznámého klíče spadne, ať se to nepropíše do UI jako průhledná barva", () => {
    expect(() => colorByKey("neexistuje")).toThrow();
  });
});

describe("firstFreeColor", () => {
  it("v prázdné partě dá první barvu", () => {
    expect(firstFreeColor([])).toBe("red");
  });

  it("přeskočí obsazené barvy", () => {
    expect(firstFreeColor(["red", "orange"])).toBe("mustard");
  });

  it("spadne, až když je obsazených všech dvanáct", () => {
    const all = MEMBER_COLORS.map((c) => c.key);
    expect(() => firstFreeColor(all)).toThrow();
  });
});
