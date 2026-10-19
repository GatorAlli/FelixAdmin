import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/lib/drizzle/drizzle-index";
import { suppliers, miscellaneousExpenditures } from "./schema";

// Called only after the page has authenticated its visitor.
export async function getOrderDatalists() {
  const [supplierRows, expenseRows] = await Promise.all([
    db.select().from(suppliers).orderBy(asc(suppliers.sl)),
    db.select().from(miscellaneousExpenditures).orderBy(asc(miscellaneousExpenditures.sl)),
  ]);
  return {
    supplierSuggestions: supplierRows.flatMap((row) => row.supplierName ? [row.supplierName] : []),
    expenseSuggestions: expenseRows.flatMap((row) => row.miscellaneousExpenditureType ? [row.miscellaneousExpenditureType] : []),
  };
}
