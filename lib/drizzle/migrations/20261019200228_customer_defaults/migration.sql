-- Replace the initial suggestions with the requested default customers.
SELECT pg_advisory_xact_lock(4604748, 3);
--> statement-breakpoint
DELETE FROM "customers";
--> statement-breakpoint
INSERT INTO "customers" ("customerName") VALUES
  ('Square Pharmaceuticals Limited'),
  ('SKF Pharmaceuticals'),
  ('Aristopharma Limited');
