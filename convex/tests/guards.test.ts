import { ConvexError } from "convex/values";
import { expect, test } from "vitest";
import { requireMembership, requireProfile, requireUser } from "../guards";
import { newTest, signedInAs } from "../../tests/convexHelpers";

/** Ověří, že volání spadne s ConvexError nesoucí přesně tenhle kód (viz lib/errors.ts). */
function rejectsWithCode(promise: Promise<unknown>, code: string) {
  return expect(promise).rejects.toSatisfy(
    (e) => e instanceof ConvexError && e.data?.code === code,
    `očekávala se ConvexError s kódem ${code}`,
  );
}

async function insertGroupWithMembership(
  t: ReturnType<typeof newTest>,
  ownerId: Awaited<ReturnType<typeof signedInAs>>["userId"],
) {
  return t.run(async (ctx) => {
    const groupId = await ctx.db.insert("groups", {
      name: "Výlet",
      emoji: "🏔️",
      currency: "CZK",
      inviteCode: "ABC123",
      ownerId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("memberships", {
      groupId,
      userId: ownerId,
      color: "blue",
      role: "owner",
      joinedAt: Date.now(),
    });
    return groupId;
  });
}

test("requireUser vrátí id přihlášeného uživatele", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { name: "Petr" });
  const result = await asUser.run(async (ctx) => requireUser(ctx));
  expect(result).toBe(userId);
});

test("requireUser spadne bez přihlášení", async () => {
  const t = newTest();
  await rejectsWithCode(
    t.run(async (ctx) => requireUser(ctx)),
    "NOT_SIGNED_IN",
  );
});

test("requireProfile vrátí uživatele s dokončeným onboardingem", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { name: "Petr", nickname: "Petr" });
  const user = await asUser.run(async (ctx) => requireProfile(ctx));
  expect(user._id).toBe(userId);
  expect(user.nickname).toBe("Petr");
});

test("requireProfile spadne bez dokončeného onboardingu", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t, { name: "Petr" }); // bez nickname
  await rejectsWithCode(
    asUser.run(async (ctx) => requireProfile(ctx)),
    "NOT_ONBOARDED",
  );
});

test("requireProfile spadne bez přihlášení", async () => {
  const t = newTest();
  await rejectsWithCode(
    t.run(async (ctx) => requireProfile(ctx)),
    "NOT_SIGNED_IN",
  );
});

test("requireMembership projde členovi party a vrátí jeho členství", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { name: "Petr" });
  const groupId = await insertGroupWithMembership(t, userId);

  const result = await asUser.run(async (ctx) => requireMembership(ctx, groupId));
  expect(result.userId).toBe(userId);
  expect(result.membership.role).toBe("owner");
  expect(result.membership.color).toBe("blue");
});

test("requireMembership spadne, když do party nepatříš", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { name: "Petr" });
  const outsider = await signedInAs(t, { name: "Jana" });
  const groupId = await insertGroupWithMembership(t, owner.userId);

  await rejectsWithCode(
    outsider.asUser.run(async (ctx) => requireMembership(ctx, groupId)),
    "NOT_MEMBER",
  );
});

test("requireMembership spadne bez přihlášení", async () => {
  const t = newTest();
  const owner = await signedInAs(t, { name: "Petr" });
  const groupId = await insertGroupWithMembership(t, owner.userId);

  await rejectsWithCode(
    t.run(async (ctx) => requireMembership(ctx, groupId)),
    "NOT_SIGNED_IN",
  );
});
