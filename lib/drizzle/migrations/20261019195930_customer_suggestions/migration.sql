CREATE TABLE "customers" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customerName" varchar NOT NULL
);

--> statement-breakpoint
INSERT INTO "customers" ("customerName")
SELECT DISTINCT ON (lower(btrim("clientName"))) btrim("clientName")
FROM "data"
WHERE "clientName" IS NOT NULL AND length(btrim("clientName")) BETWEEN 1 AND 200
ORDER BY lower(btrim("clientName")), btrim("clientName")
LIMIT 500;
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
