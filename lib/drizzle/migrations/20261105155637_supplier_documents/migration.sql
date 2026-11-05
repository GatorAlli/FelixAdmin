ALTER TABLE "order_documents" ADD COLUMN "supplierRowKey" varchar(240);
--> statement-breakpoint
CREATE UNIQUE INDEX "order_documents_supplier_row_idx" ON "order_documents" ("orderId","supplierRowKey");
