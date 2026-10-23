import * as p from "drizzle-orm/pg-core";
import type {
  Currency,
  SupplierCurrencyDetail,
  CustomSupplierDetail,
} from "./currency";
import type { MiscellaneousExpense } from "./expenses";
import type { PanelCurrencies } from "./order-calculations";

export const data = p.pgTable.withRLS("data", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  createdBy: p.varchar().notNull(),
  orderManagerAccess: p.boolean().notNull().default(true),
  lastEditedBy: p.varchar(),
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
  importedBy: p.varchar().$type<"Felix" | "Customer">(),
  suppliers: p.text(),
  gbpToUsdRate: p.numeric({ precision: 18, scale: 8 }),
  eurToUsdRate: p.numeric({ precision: 18, scale: 8 }),
  usdToSgdRate: p.numeric({ precision: 18, scale: 2 }),
  supplierCurrencyDetails: p.jsonb().$type<SupplierCurrencyDetail[]>(),
  customSupplierDetails: p
    .jsonb()
    .$type<CustomSupplierDetail[]>()
    .notNull()
    .default([]),

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

export const users = p.pgTable.withRLS("users", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: p.varchar(),
  email: p.varchar(),
  status: p.varchar(),
});

export const suppliers = p.pgTable.withRLS("suppliers", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  supplierName: p.varchar(),
});
export const customers = p.pgTable.withRLS("customers", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  customerName: p.varchar().notNull(),
  address: p.text(),
});

export const miscellaneousExpenditures = p.pgTable.withRLS(
  "miscellaneousExpenditures",
  {
    sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
    miscellaneousExpenditureType: p.varchar(),
  },
);

export const orderDocuments = p.pgTable.withRLS(
  "order_documents",
  {
    id: p.uuid().primaryKey().defaultRandom(),
    orderId: p
      .integer()
      .notNull()
      .references(() => data.sl),
    title: p.varchar({ length: 120 }).notNull(),
    originalName: p.varchar({ length: 255 }).notNull(),
    storagePath: p.text().notNull().unique(),
    mimeType: p.varchar({ length: 100 }).notNull(),
    sizeBytes: p.integer().notNull(),
    uploadedBy: p.uuid().notNull(),
    createdAt: p.timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Makes "find documents for this order" efficient.
    p.index("order_documents_order_id_idx").on(table.orderId),
  ],
);

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Expense = typeof miscellaneousExpenditures.$inferSelect;
export type NewExpense = typeof miscellaneousExpenditures.$inferInsert;
export type Order = typeof data.$inferSelect;
export type NewOrder = typeof data.$inferInsert;
export type DocumentSummary = Pick<
  typeof orderDocuments.$inferSelect,
  "id" | "title" | "originalName" | "sizeBytes"
>;
