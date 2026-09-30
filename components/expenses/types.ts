import type { Doc } from "@/convex/_generated/dataModel";

/** Tvar jedné položky z `api.expenses.listForGroup` — viz convex/expenses.ts. */
export type ExpenseWithSplits = Doc<"expenses"> & {
  category: Doc<"categories"> | null;
  splits: Doc<"splits">[];
};
