ALTER TABLE "proposals" ADD COLUMN "sgdToBdtRate" numeric(18,2) NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "eurToBdtRate" numeric(18,2) NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "gbpToBdtRate" numeric(18,2) NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "gbpToUsdRate";--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "eurToUsdRate";--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "usdToSgdRate";