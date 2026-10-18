import * as p from "drizzle-orm/pg-core";
import type { Currency, SupplierCurrencyDetail } from "./currency";
import type { MiscellaneousExpense } from "./expenses";
import type { PanelCurrencies } from "./order-calculations";

export const data = p.pgTable("data", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  createdBy: p.varchar().notNull(),
  createdDate: p.date(),
  felixOrderRef: p.varchar().notNull(),

  paymentMode: p.varchar(),

  clientOrderValue: p.numeric({ precision: 18, scale: 2 }),
  clientOrderOriginalValue: p.numeric({ precision: 18, scale: 2 }),
  clientOrderCurrency: p.varchar().$type<Currency>(),

  projectName: p.varchar(),
  projectNotes: p.text(),
  clientName: p.varchar(),
  endUser: p.varchar(),
  productSystem: p.text(),


  orderHandledBy: p.varchar(),
  suppliers: p.text(),
  gbpToUsdRate: p.numeric({ precision: 18, scale: 8 }),
  eurToUsdRate: p.numeric({ precision: 18, scale: 8 }),
  usdToSgdRate: p.numeric({ precision: 18, scale: 2 }),
  supplierCurrencyDetails: p.jsonb().$type<SupplierCurrencyDetail[]>(),

  trane: p.numeric({ precision: 18, scale: 2 }),
  belimo: p.numeric({ precision: 18, scale: 2 }),
  danfoss: p.numeric({ precision: 18, scale: 2 }),
  honeywell: p.numeric({ precision: 18, scale: 2 }),
  regeltechnik: p.numeric({ precision: 18, scale: 2 }),
  dwyer: p.numeric({ precision: 18, scale: 2 }),
  alps: p.numeric({ precision: 18, scale: 2 }),
  control4: p.numeric({ precision: 18, scale: 2 }),
  lutron: p.numeric({ precision: 18, scale: 2 }),
  landisGyr: p.numeric({ precision: 18, scale: 2 }),
  rbh: p.numeric({ precision: 18, scale: 2 }),
  prostar: p.numeric({ precision: 18, scale: 2 }),
  gissmatic: p.numeric({ precision: 18, scale: 2 }),
  zkteco: p.numeric({ precision: 18, scale: 2 }),
  adteshia: p.numeric({ precision: 18, scale: 2 }),
  fike: p.numeric({ precision: 18, scale: 2 }),
  tecofi: p.numeric({ precision: 18, scale: 2 }),
  sewo: p.numeric({ precision: 18, scale: 2 }),
  ebelco: p.numeric({ precision: 18, scale: 2 }),
  dooya: p.numeric({ precision: 18, scale: 2 }),
  pogo: p.numeric({ precision: 18, scale: 2 }),
  parkHelp: p.numeric({ precision: 18, scale: 2 }),
  foshan: p.numeric({ precision: 18, scale: 2 }),
  kele: p.numeric({ precision: 18, scale: 2 }),
  multicable: p.numeric({ precision: 18, scale: 2 }),
  deyz: p.numeric({ precision: 18, scale: 2 }),
  simens: p.numeric({ precision: 18, scale: 2 }),
  flashTurtle: p.numeric({ precision: 18, scale: 2 }),
  servo: p.numeric({ precision: 18, scale: 2 }),
  haboo: p.numeric({ precision: 18, scale: 2 }),
  others: p.numeric({ precision: 18, scale: 2 }),

  misCost: p.numeric({ precision: 18, scale: 2 }),
  miscellaneousExpenses: p.jsonb().$type<MiscellaneousExpense[]>(),

  paymentNotes: p.text(),
  calculationCurrencies: p.jsonb().$type<PanelCurrencies>(),
  // Fee settings are percentages: 5 means 5%, not 0.05.
  orderHandlingFee: p.numeric({ precision: 18, scale: 4 }),
  miscellaneousHandlingFee: p.numeric({ precision: 18, scale: 4 }),
});

export const users = p.pgTable("users", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: p.varchar(),
  email: p.varchar(),
  status: p.varchar(),
});

export type Order = typeof data.$inferSelect;
export type NewOrder = typeof data.$inferInsert;
