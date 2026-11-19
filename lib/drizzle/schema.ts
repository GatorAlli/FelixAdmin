import * as p from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { randomUUID } from "node:crypto";

import type { Currency } from "./currency";
import type { ProjectStatus } from "./project-status";

// One row per proposal. The original value is kept alongside its BDT equivalent.
export const proposals = p.pgTable.withRLS(
  "proposals",
  {
    sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
    referenceNumber: p.varchar().notNull().unique(),
    createdBy: p.varchar().notNull(),
    createdDate: p.date().notNull(),
    lastEditedBy: p.varchar(),
    lastEditedAt: p.timestamp({ withTimezone: true }),
    proposalManagerAccess: p.boolean().notNull().default(true),

    projectName: p.varchar().notNull(),
    clientName: p.varchar().notNull(),
    endUser: p.varchar(),
    consultant: p.varchar(),
    system: p.varchar(),

    valueOriginal: p.numeric({ precision: 18, scale: 2 }),
    valueCurrency: p.varchar().$type<Currency>(),
    valueBdt: p.numeric({ precision: 18, scale: 2 }),
    gbpToUsdRate: p.numeric({ precision: 18, scale: 2 }).notNull(),
    eurToUsdRate: p.numeric({ precision: 18, scale: 2 }).notNull(),
    usdToSgdRate: p.numeric({ precision: 18, scale: 2 }).notNull(),
    usdToBdtRate: p.numeric({ precision: 18, scale: 2 }).notNull(),

    projectStatus: p
      .varchar()
      .$type<ProjectStatus>()
      .notNull()
      .default("Current"),
    finalizationDate: p.date(),
    proposalNotes: p.text(),
  },
  (table) => [
    // The database rejects values the application would never save.
    p.check(
      "proposals_project_status_check",
      sql`${table.projectStatus} in ('Current', 'Secured', 'Lost')`,
    ),
    p.check(
      "proposals_value_currency_check",
      sql`${table.valueCurrency} in ('USD', 'SGD', 'EUR', 'GBP', 'BDT')`,
    ),
  ],
);

// Application profiles and roles; Better Auth stores login credentials separately.
export const users = p.pgTable.withRLS("users", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: p.varchar(),
  email: p.varchar(),
  status: p.varchar(),
});

// Suggestion catalogs used by Settings and the proposal form.
export const clients = p.pgTable.withRLS("clients", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  clientName: p.varchar().notNull(),
});
export const systems = p.pgTable.withRLS("systems", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  systemName: p.varchar().notNull(),
});

// Document metadata only; file bytes live in .local/documents.
export const proposalDocuments = p.pgTable.withRLS(
  "proposal_documents",
  {
    id: p
      .uuid()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    proposalId: p
      .integer()
      .notNull()
      .references(() => proposals.sl),
    title: p.varchar({ length: 120 }).notNull(),
    originalName: p.varchar({ length: 255 }).notNull(),
    storagePath: p.text().notNull().unique(),
    mimeType: p.varchar({ length: 100 }).notNull(),
    sizeBytes: p.integer().notNull(),
    uploadedBy: p.uuid().notNull(),
    createdAt: p.timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Makes "find documents for this proposal" efficient.
    p.index("proposal_documents_proposal_id_idx").on(table.proposalId),
  ],
);

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type System = typeof systems.$inferSelect;
export type DocumentSummary = Pick<
  typeof proposalDocuments.$inferSelect,
  "id" | "title" | "originalName" | "sizeBytes"
>;
