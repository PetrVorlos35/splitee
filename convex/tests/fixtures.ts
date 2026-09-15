import { api } from "../_generated/api";
import { newTest, signedInAs } from "../../tests/convexHelpers";

/** Parta „Spolubydlení" s Dejnym (owner), Petrem a Janou a výchozími kategoriemi. */
export async function setupGroup() {
  const t = newTest();
  const dejny = await signedInAs(t, { nickname: "Dejny" });
  const petr = await signedInAs(t, { nickname: "Petr" });
  const jana = await signedInAs(t, { nickname: "Jana" });

  const groupId = await dejny.asUser.mutation(api.groups.create, {
    name: "Spolubydlení",
    emoji: "🏠",
    currency: "CZK",
  });
  const { inviteCode } = await dejny.asUser.query(api.groups.get, { groupId });

  await petr.asUser.mutation(api.groups.joinByCode, { code: inviteCode });
  await jana.asUser.mutation(api.groups.joinByCode, { code: inviteCode });

  const categories = await dejny.asUser.query(api.categories.listForGroup, { groupId });

  return { t, groupId, dejny, petr, jana, categories, categoryId: categories[0]._id };
}
