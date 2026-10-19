CREATE TABLE IF NOT EXISTS "miscellaneousExpenditures" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "miscellaneousExpenditures_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"miscellaneousExpenditureType" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "suppliers_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supplierName" varchar
);

--> statement-breakpoint
INSERT INTO "suppliers" ("supplierName")
SELECT value FROM unnest(ARRAY['TRANE', 'BELIMO', 'DANFOSS', 'HONEYWELL', 'REGELTECHNIK', 'DWYER', 'ALPS', 'CONTROL 4', 'LUTRON', 'LANDIS+GYR', 'RBH', 'PROSTAR', 'GISSMATIC', 'ZKTECO', 'ADTESHIA', 'FIKE', 'TECOFI', 'SEWO', 'EBELCO', 'DOOYA', 'POGO', 'PARK HELP', 'FOSHAN', 'KELE', 'MULTICABLE', 'DEYZ', 'SIMENS', 'FLASH TURTLE', 'SERVO', 'HABOO', 'OTHERS']::text[]) AS value
WHERE NOT EXISTS (SELECT 1 FROM "suppliers");

--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
INSERT INTO "miscellaneousExpenditures" ("miscellaneousExpenditureType")
SELECT value FROM unnest(ARRAY['FREIGHT: USA TO SINGAPORE', 'FREIGHT: GERMANY TO SINGAPORE', 'FREIGHT: CHINA TO SINGAPORE', 'Bank Fee', 'DHL Cost', 'UPS Cost']::text[]) AS value
WHERE NOT EXISTS (SELECT 1 FROM "miscellaneousExpenditures");

--> statement-breakpoint
ALTER TABLE "miscellaneousExpenditures" ENABLE ROW LEVEL SECURITY;
