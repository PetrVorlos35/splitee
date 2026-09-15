import { ConvexError } from "convex/values";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { newTest, signedInAs } from "../../tests/convexHelpers";

/** Ověří, že mutace spadne s ConvexError nesoucí přesně tenhle kód (viz lib/errors.ts). */
function rejectsWithCode(promise: Promise<unknown>, code: string) {
  return expect(promise).rejects.toSatisfy(
    (e) => e instanceof ConvexError && e.data?.code === code,
    `očekávala se ConvexError s kódem ${code}`,
  );
}

test("onboarding uloží přezdívku i akcent", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { name: "Daniel" });

  await asUser.mutation(api.users.completeOnboarding, {
    nickname: "Dejny",
    accentColor: "blue",
  });

  const viewer = await asUser.query(api.users.viewer, {});
  expect(viewer?.nickname).toBe("Dejny");
  expect(viewer?.accentColor).toBe("blue");
  expect(viewer?._id).toBe(userId);
});

test("nepřihlášený onboarding neprojde", async () => {
  const t = newTest();
  await rejectsWithCode(
    t.mutation(api.users.completeOnboarding, { nickname: "Kdokoli", accentColor: "blue" }),
    "NOT_SIGNED_IN",
  );
});

test("prázdná přezdívka neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await rejectsWithCode(
    asUser.mutation(api.users.completeOnboarding, { nickname: "   ", accentColor: "blue" }),
    "NICKNAME_EMPTY",
  );
});

test("přezdívka se ořízne od mezer", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await asUser.mutation(api.users.completeOnboarding, {
    nickname: "  Dejny  ",
    accentColor: "blue",
  });
  expect((await asUser.query(api.users.viewer, {}))?.nickname).toBe("Dejny");
});

test("přezdívka na hranici 24 znaků projde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  const nickname = "x".repeat(24);
  await asUser.mutation(api.users.completeOnboarding, { nickname, accentColor: "blue" });
  expect((await asUser.query(api.users.viewer, {}))?.nickname).toBe(nickname);
});

test("příliš dlouhá přezdívka neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await rejectsWithCode(
    asUser.mutation(api.users.completeOnboarding, {
      nickname: "x".repeat(25),
      accentColor: "blue",
    }),
    "NICKNAME_TOO_LONG",
  );
});

test("neznámý akcent neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await rejectsWithCode(
    asUser.mutation(api.users.completeOnboarding, { nickname: "Dejny", accentColor: "#123456" }),
    "UNKNOWN_ACCENT",
  );
});

test("updateProfile mění jen to, co dostane (jen akcent)", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await asUser.mutation(api.users.completeOnboarding, {
    nickname: "Dejny",
    accentColor: "blue",
  });

  await asUser.mutation(api.users.updateProfile, { accentColor: "green" });

  const viewer = await asUser.query(api.users.viewer, {});
  expect(viewer?.nickname).toBe("Dejny");
  expect(viewer?.accentColor).toBe("green");
});

test("updateProfile mění jen to, co dostane (jen přezdívka)", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await asUser.mutation(api.users.completeOnboarding, {
    nickname: "Dejny",
    accentColor: "blue",
  });

  await asUser.mutation(api.users.updateProfile, { nickname: "Dan" });

  const viewer = await asUser.query(api.users.viewer, {});
  expect(viewer?.nickname).toBe("Dan");
  expect(viewer?.accentColor).toBe("blue");
});

test("nepřihlášený updateProfile neprojde", async () => {
  const t = newTest();
  await rejectsWithCode(
    t.mutation(api.users.updateProfile, { nickname: "Kdokoli" }),
    "NOT_SIGNED_IN",
  );
});

test("updateProfile bez dokončeného onboardingu neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t); // bez nickname — onboarding neproběhl
  await rejectsWithCode(
    asUser.mutation(api.users.updateProfile, { accentColor: "green" }),
    "NOT_ONBOARDED",
  );
});
