DROP INDEX "order_documents_supplier_row_idx";--> statement-breakpoint
CREATE INDEX "order_documents_supplier_row_idx" ON "order_documents" ("orderId","supplierRowKey");