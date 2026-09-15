import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { newTest, signedInAs } from "../../tests/convexHelpers";

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
  await expect(
    t.mutation(api.users.completeOnboarding, { nickname: "Kdokoli", accentColor: "blue" }),
  ).rejects.toThrow();
});

test("prázdná přezdívka neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await expect(
    asUser.mutation(api.users.completeOnboarding, { nickname: "   ", accentColor: "blue" }),
  ).rejects.toThrow(/přezdívku/i);
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

test("příliš dlouhá přezdívka neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await expect(
    asUser.mutation(api.users.completeOnboarding, {
      nickname: "x".repeat(25),
      accentColor: "blue",
    }),
  ).rejects.toThrow();
});

test("neznámý akcent neprojde", async () => {
  const t = newTest();
  const { asUser } = await signedInAs(t);
  await expect(
    asUser.mutation(api.users.completeOnboarding, { nickname: "Dejny", accentColor: "#123456" }),
  ).rejects.toThrow();
});

test("updateProfile mění jen to, co dostane", async () => {
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
