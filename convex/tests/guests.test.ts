import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { signedInAs } from "../../tests/convexHelpers";
import { setupGroup } from "../../tests/fixtures";

const DEN = new Date("2026-09-10T12:00:00Z").getTime();

/** Dejny přidá hosta Honzu a zapíše, že Honza zaplatil 300 Kč za Dejnyho, Petra a sebe. */
async function honzaPlatil() {
  const ctx = await setupGroup();
  const honzaId = await ctx.dejny.asUser.mutation(api.guests.add, { groupId: ctx.groupId, nickname: " Honza " });
  await ctx.dejny.asUser.mutation(api.expenses.create, {
    groupId: ctx.groupId,
    payerId: honzaId,
    amount: 30000,
    title: "Benzín",
    categoryId: ctx.categoryId,
    spentAt: DEN,
    splitMode: "equal",
    participants: [{ userId: ctx.dejny.userId }, { userId: ctx.petr.userId }, { userId: honzaId }],
  });
  const { inviteCode } = await ctx.dejny.asUser.query(api.groups.get, { groupId: ctx.groupId });
  return { ...ctx, honzaId, inviteCode };
}

test("host se objeví mezi členy s příznakem isGuest a vlastní barvou", async () => {
  const { groupId, dejny, honzaId } = await honzaPlatil();
  const group = await dejny.asUser.query(api.groups.get, { groupId });
  const honza = group.members.find((m) => m.userId === honzaId)!;
  expect(honza).toMatchObject({ nickname: "Honza", isGuest: true, role: "member" });
  expect(new Set(group.members.map((m) => m.color)).size).toBe(group.members.length);
  expect(group.members.filter((m) => !m.isGuest)).toHaveLength(3);
});

test("za hosta může převod zaplatit kdokoli z party, i třetí člověk", async () => {
  const { groupId, jana, petr, honzaId } = await honzaPlatil();
  // Jana není ve výdaji vůbec — přesto zaeviduje, že Petr poslal hostovi
  const settlementId = await jana.asUser.mutation(api.settlements.settleTransfer, {
    groupId,
    from: petr.userId,
    to: honzaId,
    amount: 10000,
  });
  const debts = await jana.asUser.query(api.settlements.debts, { groupId });
  expect(debts.some((d) => d.from === petr.userId)).toBe(false);

  await jana.asUser.mutation(api.settlements.unsettleSettlement, { settlementId });
  const again = await jana.asUser.query(api.settlements.debts, { groupId });
  expect(again.find((d) => d.from === petr.userId)).toMatchObject({ to: honzaId, amount: 10000 });
});

test("za přihlášeného člověka převod platit nejde, jen za hosta", async () => {
  const { groupId, jana, petr, dejny } = await honzaPlatil();
  await expect(
    jana.asUser.mutation(api.settlements.settleTransfer, { groupId, from: petr.userId, to: dejny.userId, amount: 100 }),
  ).rejects.toMatchObject({ data: { code: "DEBT_NOT_YOURS" } });
});

test("převzetí hosta přepíše výdaje i podíly na nový účet a hosta smaže", async () => {
  const { t, groupId, dejny, honzaId, inviteCode } = await honzaPlatil();
  const novak = await signedInAs(t, { nickname: "Honza N." });

  const joined = await novak.asUser.mutation(api.guests.claim, { code: inviteCode.toLowerCase(), guestId: honzaId });
  expect(joined).toBe(groupId);

  const group = await dejny.asUser.query(api.groups.get, { groupId });
  expect(group.members.some((m) => m.userId === honzaId)).toBe(false);
  expect(group.members.find((m) => m.userId === novak.userId)).toMatchObject({ isGuest: false, nickname: "Honza N." });

  const debts = await dejny.asUser.query(api.settlements.debts, { groupId });
  expect(debts.map((d) => d.to)).toEqual([novak.userId, novak.userId]);

  const expenses = await dejny.asUser.query(api.expenses.listForGroup, { groupId, period: "all" });
  expect(expenses[0].payerId).toBe(novak.userId);
  expect(expenses[0].splits.map((s) => s.userId)).toContain(novak.userId);
  expect(await t.run((ctx) => ctx.db.get(honzaId))).toBeNull();

  // převzatý host je pryč, druhý pokus už nemá co převzít
  const other = await signedInAs(t, { nickname: "Jiný" });
  await expect(other.asUser.mutation(api.guests.claim, { code: inviteCode, guestId: honzaId })).rejects.toThrow();
});

test("kdo už v partě je, hosta převzít nesmí", async () => {
  const { petr, honzaId, inviteCode } = await honzaPlatil();
  await expect(petr.asUser.mutation(api.guests.claim, { code: inviteCode, guestId: honzaId })).rejects.toMatchObject({
    data: { code: "ALREADY_MEMBER" },
  });
});

test("hosta s výdaji odebrat nejde, prázdného ano", async () => {
  const { groupId, dejny, honzaId } = await honzaPlatil();
  await expect(dejny.asUser.mutation(api.guests.remove, { groupId, guestId: honzaId })).rejects.toMatchObject({
    data: { code: "GUEST_HAS_ACTIVITY" },
  });

  const pepaId = await dejny.asUser.mutation(api.guests.add, { groupId, nickname: "Pepa" });
  await dejny.asUser.mutation(api.guests.rename, { groupId, guestId: pepaId, nickname: "Pepík" });
  await dejny.asUser.mutation(api.guests.remove, { groupId, guestId: pepaId });
  const group = await dejny.asUser.query(api.groups.get, { groupId });
  expect(group.members.some((m) => m.userId === pepaId)).toBe(false);
});

test("seznam hostů pro pozvánku vidí jen přihlášený a pozná existující členství", async () => {
  const { t, petr, honzaId, inviteCode } = await honzaPlatil();
  const mine = await petr.asUser.query(api.guests.listByCode, { code: inviteCode });
  expect(mine.alreadyMember).toBe(true);

  const cizi = await signedInAs(t, { nickname: "Cizí" });
  const theirs = await cizi.asUser.query(api.guests.listByCode, { code: inviteCode });
  expect(theirs).toMatchObject({ alreadyMember: false, guests: [{ userId: honzaId, nickname: "Honza" }] });

  await expect(t.query(api.guests.listByCode, { code: inviteCode })).rejects.toThrow();
});

test("host má v bilancích, kolik mu ostatní pošlou", async () => {
  const { groupId, dejny, honzaId } = await honzaPlatil();
  const rows = await dejny.asUser.query(api.settlements.balances, { groupId });
  expect(rows[0]).toMatchObject({ userId: honzaId, nickname: "Honza", balance: 20000 });
});

test("barva z profilu se použije v nové partě, když je volná", async () => {
  const { t } = await setupGroup();
  const eva = await signedInAs(t, { nickname: "Eva" });
  await t.run((ctx) => ctx.db.patch(eva.userId, { accentColor: "teal" }));
  const groupId = await eva.asUser.mutation(api.groups.create, { name: "Chata", emoji: "🏔️", currency: "CZK" });
  const group = await eva.asUser.query(api.groups.get, { groupId });
  expect(group.members[0].color).toBe("teal");
});
