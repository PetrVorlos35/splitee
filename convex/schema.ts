import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // přepisuje authTables.users — původní pole musí zůstat zachovaná
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // vlastní pole Splitee
    nickname: v.optional(v.string()),
    accentColor: v.optional(v.string()), // klíč z MEMBER_COLORS, ne hex
    lastGroupId: v.optional(v.id("groups")),
    // host = zástupný člen bez účtu. Patří právě do jedné party; přihlásit se
    // za něj nejde, jen ho převzít (convex/guests.ts:claim), čímž se všechny
    // odkazy přepíšou na skutečný účet a tenhle dokument zmizí.
    guestGroupId: v.optional(v.id("groups")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  groups: defineTable({
    name: v.string(),
    emoji: v.string(),
    currency: v.string(),
    inviteCode: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  }).index("by_inviteCode", ["inviteCode"]),

  memberships: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    color: v.string(), // klíč z MEMBER_COLORS, v rámci party unikátní
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(), // určuje pořadí při dělení zbytkových haléřů
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),

  categories: defineTable({
    groupId: v.id("groups"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    order: v.number(),
  }).index("by_group", ["groupId"]),

  expenses: defineTable({
    groupId: v.id("groups"),
    payerId: v.id("users"),
    amount: v.number(), // haléře
    title: v.string(),
    note: v.optional(v.string()),
    categoryId: v.id("categories"),
    spentAt: v.number(), // datum útraty, ne zadání
    splitMode: v.union(v.literal("equal"), v.literal("exact"), v.literal("shares")),
    source: v.union(v.literal("manual"), v.literal("receipt"), v.literal("recurring")),
    receiptImageUrl: v.optional(v.string()),
    receiptPublicId: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    // chybí, dokud výdaj nikdo neupravil — kdokoli z party smí upravit
    // cizí výdaj (viz convex/expenses.ts), takže createdBy samo o sobě
    // neprozradí, kdo naposledy změnil částku
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  })
    .index("by_group_spentAt", ["groupId", "spentAt"])
    .index("by_group_payer", ["groupId", "payerId"]),

  splits: defineTable({
    expenseId: v.id("expenses"),
    groupId: v.id("groups"),
    userId: v.id("users"),
    payerId: v.id("users"), // denormalizováno z výdaje kvůli výpočtu dluhů
    spentAt: v.number(), // denormalizováno kvůli koláči za období
    amount: v.number(),
    weight: v.optional(v.number()),
    settled: v.boolean(),
    settledAt: v.optional(v.number()),
    settlementId: v.optional(v.id("settlements")),
  })
    .index("by_expense", ["expenseId"])
    .index("by_group_settled", ["groupId", "settled"])
    .index("by_group_user_settled", ["groupId", "userId", "settled"])
    .index("by_group_spentAt", ["groupId", "spentAt"])
    // pro unsettleSettlement (convex/settlements.ts) — najít přesně ty
    // podíly, které patří jednomu hromadnému vyrovnání, bez skenu celé party
    .index("by_settlementId", ["settlementId"]),

  // Dva druhy záznamů:
  //  - bez `kind` = staré vyrovnání dvojice (před zjednodušenými dluhy):
  //    podíly, které pokrylo, nesou jeho settlementId a jsou settled, do
  //    bilance už nic nepřidává;
  //  - `kind: "transfer"` = zaplacený převod ze zjednodušených dluhů
  //    (convex/settlements.ts settleTransfer). Dokud nemá `closedBy`, počítá
  //    se do bilancí vedle nevyrovnaných podílů. Když se po něm všichni
  //    dostanou na nulu, parta se uzavře: podíly dostanou jeho settlementId
  //    a všechny otevřené převody `closedBy` = jeho _id.
  settlements: defineTable({
    groupId: v.id("groups"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    note: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    kind: v.optional(v.literal("transfer")),
    closedBy: v.optional(v.id("settlements")),
  }).index("by_group", ["groupId"]),
});
