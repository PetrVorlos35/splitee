import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { uniqueInviteCode } from "../groups";
import { INVITE_ALPHABET } from "../lib/inviteCode";
import { MEMBER_COLORS } from "../../lib/colors";
import { newTest, signedInAs } from "../../tests/convexHelpers";

const PARTA = { name: "Spolubydlení", emoji: "🏠", currency: "CZK" };

test("zakladatel party dostane roli owner a první barvu", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { nickname: "Dejny" });

  const groupId = await asUser.mutation(api.groups.create, PARTA);
  const group = await asUser.query(api.groups.get, { groupId });

  expect(group.name).toBe("Spolubydlení");
  expect(group.members).toHaveLength(1);
  expect(group.members[0].userId).toBe(userId);
  expect(group.members[0].role).toBe("owner");
  expect(group.members[0].color).toBe(MEMBER_COLORS[0].key);
});

test("nová parta dostane sedm výchozích kategorií", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t, { nickname: "Dejny" });
  const groupId = await asUser.mutation(api.groups.create, PARTA);

  const categories = await asUser.query(api.categories.listForGroup, { groupId });
  expect(categories).toHaveLength(7);
  expect(categories.map((c) => c.name)).toContain("Jídlo");
  expect(categories[0].order).toBe(0);
});

test("invite kód má šest znaků a je u každé party jiný", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t, { nickname: "Dejny" });

  const a = await asUser.mutation(api.groups.create, PARTA);
  const b = await asUser.mutation(api.groups.create, { ...PARTA, name: "Dovolená" });

  const ga = await asUser.query(api.groups.get, { groupId: a });
  const gb = await asUser.query(api.groups.get, { groupId: b });

  expect(ga.inviteCode).toHaveLength(6);
  expect(ga.inviteCode).not.toBe(gb.inviteCode);
});

test("druhý člen dostane další volnou barvu", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const guest = await signedInAs(t, { nickname: "Petr" });

  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);
  const { inviteCode } = await owner.asUser.query(api.groups.get, { groupId });

  await guest.asUser.mutation(api.groups.joinByCode, { code: inviteCode });

  const group = await owner.asUser.query(api.groups.get, { groupId });
  expect(group.members).toHaveLength(2);
  expect(group.members.map((m) => m.color)).toEqual([MEMBER_COLORS[0].key, MEMBER_COLORS[1].key]);
});

test("kód se bere bez ohledu na velikost písmen a mezery", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const guest = await signedInAs(t, { nickname: "Petr" });

  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);
  const { inviteCode } = await owner.asUser.query(api.groups.get, { groupId });

  await guest.asUser.mutation(api.groups.joinByCode, { code: ` ${inviteCode.toLowerCase()} ` });
  expect((await owner.asUser.query(api.groups.get, { groupId })).members).toHaveLength(2);
});

test("neplatný kód spadne", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t, { nickname: "Petr" });
  // ConvexError nese jen strojový kód — česká věta se skládá až v komponentě
  // přes t(), viz lib/i18n.ts. Redakce zprávy v produkci by jinak spolkla
  // obyčejnou Error zprávu, tenhle test proto míří na .data.code.
  await expect(asUser.mutation(api.groups.joinByCode, { code: "ZZZZZZ" })).rejects.toMatchObject({
    data: { code: "INVITE_CODE_INVALID" },
  });
});

test("opakovaný vstup do party členství nezduplikuje", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const guest = await signedInAs(t, { nickname: "Petr" });

  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);
  const { inviteCode } = await owner.asUser.query(api.groups.get, { groupId });

  await guest.asUser.mutation(api.groups.joinByCode, { code: inviteCode });
  await guest.asUser.mutation(api.groups.joinByCode, { code: inviteCode });

  expect((await owner.asUser.query(api.groups.get, { groupId })).members).toHaveLength(2);
});

test("jedenáctý člen se do party nedostane", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);
  const { inviteCode } = await owner.asUser.query(api.groups.get, { groupId });

  for (let i = 1; i < 10; i++) {
    const member = await signedInAs(t, { nickname: `Člen ${i}` });
    await member.asUser.mutation(api.groups.joinByCode, { code: inviteCode });
  }
  const full = await owner.asUser.query(api.groups.get, { groupId });
  expect(full.members).toHaveLength(10);
  // "barva nese význam" — deset lidí, deset různých barev, ne devět
  // barevných dvojic.
  expect(new Set(full.members.map((m) => m.color)).size).toBe(10);

  const eleventh = await signedInAs(t, { nickname: "Jedenáctý" });
  await expect(
    eleventh.asUser.mutation(api.groups.joinByCode, { code: inviteCode }),
  ).rejects.toMatchObject({ data: { code: "GROUP_FULL" } });
});

test("nečlen partu nevidí", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const outsider = await signedInAs(t, { nickname: "Cizí" });

  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);

  await expect(outsider.asUser.query(api.groups.get, { groupId })).rejects.toThrow();
});

test("listMine vrací jen party, kde jsem", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const other = await signedInAs(t, { nickname: "Petr" });

  await owner.asUser.mutation(api.groups.create, PARTA);
  await other.asUser.mutation(api.groups.create, { ...PARTA, name: "Cizí parta" });

  const mine = await owner.asUser.query(api.groups.listMine, {});
  expect(mine).toHaveLength(1);
  expect(mine[0].name).toBe("Spolubydlení");
  expect(mine[0].memberCount).toBe(1);
});

test("previewByCode funguje i bez přihlášení a neprozradí členy", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);
  const { inviteCode } = await owner.asUser.query(api.groups.get, { groupId });

  const preview = await t.query(api.groups.previewByCode, { code: inviteCode });
  expect(preview).toMatchObject({ name: "Spolubydlení", emoji: "🏠", memberCount: 1 });
  expect(preview).not.toHaveProperty("members");

  expect(await t.query(api.groups.previewByCode, { code: "ZZZZZZ" })).toBeNull();
});

test("uniqueInviteCode zopakuje losování při kolizi a napodruhé uspěje", async () => {
  const t = newTest();
  const { userId } = await signedInAs(t, { nickname: "Dejny" });

  // rng vždy vrátí index 0 abecedy pro prvních 6 volání (jeden pokus
  // generateInviteCode) → "AAAAAA", což už v DB existuje; dalších 6 volání
  // vrátí jiný index → jiný, volný kód.
  await t.run(async (ctx) => {
    await ctx.db.insert("groups", {
      name: "Obsazeno",
      emoji: "🔒",
      currency: "CZK",
      inviteCode: INVITE_ALPHABET[0].repeat(6),
      ownerId: userId,
      createdAt: Date.now(),
    });
  });

  let calls = 0;
  const rng = () => {
    const batch = Math.floor(calls / 6);
    calls++;
    return batch === 0 ? 0 : 0.5;
  };

  const code = await t.run(async (ctx) => uniqueInviteCode(ctx, rng));
  expect(code).toHaveLength(6);
  expect(code).not.toBe(INVITE_ALPHABET[0].repeat(6));
});

test("uniqueInviteCode spadne s INVITE_CODE_EXHAUSTED, když kolidují všechny pokusy", async () => {
  const t = newTest();
  const { userId } = await signedInAs(t, { nickname: "Dejny" });

  await t.run(async (ctx) => {
    await ctx.db.insert("groups", {
      name: "Obsazeno",
      emoji: "🔒",
      currency: "CZK",
      inviteCode: INVITE_ALPHABET[0].repeat(6),
      ownerId: userId,
      createdAt: Date.now(),
    });
  });

  // rng pořád vrací index 0 → generateInviteCode pořád vrátí "AAAAAA",
  // které vždy koliduje — všech pět pokusů selže.
  const rng = () => 0;

  await expect(t.run(async (ctx) => uniqueInviteCode(ctx, rng))).rejects.toMatchObject({
    data: { code: "INVITE_CODE_EXHAUSTED" },
  });
});

test("create s prázdným nebo jen mezerovým názvem spadne", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t, { nickname: "Dejny" });

  await expect(
    asUser.mutation(api.groups.create, { ...PARTA, name: "   " }),
  ).rejects.toMatchObject({ data: { code: "GROUP_NAME_EMPTY" } });
});

test("categories.listForGroup spadne nečlenovi", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { nickname: "Dejny" });
  const outsider = await signedInAs(t, { nickname: "Cizí" });

  const groupId = await owner.asUser.mutation(api.groups.create, PARTA);

  await expect(
    outsider.asUser.query(api.categories.listForGroup, { groupId }),
  ).rejects.toMatchObject({ data: { code: "NOT_MEMBER" } });
});

test("listMine vynechá archivované party", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { nickname: "Dejny" });

  const groupId = await asUser.mutation(api.groups.create, PARTA);
  await t.run(async (ctx) => {
    await ctx.db.patch(groupId, { archivedAt: Date.now() });
  });

  expect(await asUser.query(api.groups.listMine, {})).toHaveLength(0);

  // kontrola, že membership/DB fixture skutečně míří na tu samou partu a
  // test tedy ověřuje filtr, ne náhodou prázdný seznam
  const membership = await t.run(async (ctx) =>
    ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first(),
  );
  expect(membership?.groupId).toBe(groupId);
});

test("vlastník se svým vlastním kódem jen zůstane v partě, nezdvojí členství", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t, { nickname: "Dejny" });

  const groupId = await asUser.mutation(api.groups.create, PARTA);
  const { inviteCode } = await asUser.query(api.groups.get, { groupId });

  const result = await asUser.mutation(api.groups.joinByCode, { code: inviteCode });
  expect(result).toBe(groupId);

  const group = await asUser.query(api.groups.get, { groupId });
  expect(group.members).toHaveLength(1);
  expect(group.members[0].role).toBe("owner");
});
