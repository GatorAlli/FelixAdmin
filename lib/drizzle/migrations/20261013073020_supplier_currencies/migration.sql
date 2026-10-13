ALTER TABLE "data" ADD COLUMN "gbpToUsdRate" numeric(18,8);--> statement-breakpoint
ALTER TABLE "data" ADD COLUMN "eurToUsdRate" numeric(18,8);--> statement-breakpoint
ALTER TABLE "data" ADD COLUMN "supplierCurrencyDetails" jsonb;