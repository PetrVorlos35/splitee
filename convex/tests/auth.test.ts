import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { newTest, signedInAs } from "./helpers";

test("nepřihlášený uživatel nedostane profil", async () => {
  const t = newTest();
  expect(await t.query(api.users.viewer, {})).toBeNull();
});

test("přihlášený uživatel dostane svůj profil", async () => {
  const t = newTest();
  const { userId, asUser } = await signedInAs(t, { name: "Petr", email: "petr@example.com" });

  const viewer = await asUser.query(api.users.viewer, {});
  expect(viewer?._id).toBe(userId);
  expect(viewer?.name).toBe("Petr");
});

test("dva přihlášení uživatelé se nepletou", async () => {
  const t = newTest();
  const petr = await signedInAs(t, { name: "Petr" });
  const jana = await signedInAs(t, { name: "Jana" });

  expect((await petr.asUser.query(api.users.viewer, {}))?.name).toBe("Petr");
  expect((await jana.asUser.query(api.users.viewer, {}))?.name).toBe("Jana");
});
