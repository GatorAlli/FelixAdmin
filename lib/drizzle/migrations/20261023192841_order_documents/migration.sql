CREATE TABLE "order_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"orderId" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"storagePath" text NOT NULL UNIQUE,
	"mimeType" varchar(100) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"uploadedBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "data" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "miscellaneousExpenditures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "order_documents_order_id_idx" ON "order_documents" ("orderId");--> statement-breakpoint
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_orderId_data_sl_fkey" FOREIGN KEY ("orderId") REFERENCES "data"("sl");