CREATE SCHEMA "better_auth";

CREATE TABLE "customers" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customerName" varchar NOT NULL,
	"address" text
);

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "data" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "data_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"createdBy" varchar NOT NULL,
	"orderManagerAccess" boolean DEFAULT true NOT NULL,
	"lastEditedBy" varchar,
	"lastEditedAt" timestamp with time zone,
	"createdDate" date,
	"felixOrderRef" varchar NOT NULL,
	"paymentMode" varchar,
	"clientOrderValue" numeric(18,2),
	"clientOrderOriginalValue" numeric(18,2),
	"clientOrderCurrency" varchar,
	"projectName" varchar,
	"projectNotes" text,
	"clientName" varchar,
	"endUser" varchar,
	"productSystem" text,
	"orderHandledBy" varchar,
	"importedBy" varchar,
	"suppliers" text,
	"gbpToUsdRate" numeric(18,8),
	"eurToUsdRate" numeric(18,8),
	"usdToSgdRate" numeric(18,2),
	"supplierCurrencyDetails" jsonb,
	"customSupplierDetails" jsonb DEFAULT '[]' NOT NULL,
	"trane" numeric(18,2),
	"belimo" numeric(18,2),
	"danfoss" numeric(18,2),
	"honeywell" numeric(18,2),
	"regeltechnik" numeric(18,2),
	"dwyer" numeric(18,2),
	"alps" numeric(18,2),
	"control4" numeric(18,2),
	"lutron" numeric(18,2),
	"landisGyr" numeric(18,2),
	"rbh" numeric(18,2),
	"prostar" numeric(18,2),
	"gissmatic" numeric(18,2),
	"zkteco" numeric(18,2),
	"adteshia" numeric(18,2),
	"fike" numeric(18,2),
	"tecofi" numeric(18,2),
	"sewo" numeric(18,2),
	"ebelco" numeric(18,2),
	"dooya" numeric(18,2),
	"pogo" numeric(18,2),
	"parkHelp" numeric(18,2),
	"foshan" numeric(18,2),
	"kele" numeric(18,2),
	"multicable" numeric(18,2),
	"deyz" numeric(18,2),
	"simens" numeric(18,2),
	"flashTurtle" numeric(18,2),
	"servo" numeric(18,2),
	"haboo" numeric(18,2),
	"others" numeric(18,2),
	"misCost" numeric(18,2),
	"miscellaneousExpenses" jsonb,
	"paymentNotes" text,
	"calculationCurrencies" jsonb,
	"orderHandlingFee" numeric(18,4),
	"miscellaneousHandlingFee" numeric(18,4)
);

ALTER TABLE "data" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "miscellaneousExpenditures" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "miscellaneousExpenditures_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"miscellaneousExpenditureType" varchar
);

ALTER TABLE "miscellaneousExpenditures" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "order_documents" (
	"id" uuid PRIMARY KEY,
	"orderId" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"storagePath" text NOT NULL UNIQUE,
	"mimeType" varchar(100) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"uploadedBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "order_documents" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "suppliers" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "suppliers_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supplierName" varchar
);

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "users" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar,
	"email" varchar,
	"status" varchar
);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "better_auth"."account" (
	"id" uuid PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);

CREATE TABLE "better_auth"."rate_limit" (
	"id" uuid PRIMARY KEY,
	"key" text NOT NULL UNIQUE,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);

CREATE TABLE "better_auth"."session" (
	"id" uuid PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);

CREATE TABLE "better_auth"."user" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "better_auth"."verification" (
	"id" uuid PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "order_documents_order_id_idx" ON "order_documents" ("orderId");
CREATE INDEX "account_userId_idx" ON "better_auth"."account" ("user_id");
CREATE INDEX "session_userId_idx" ON "better_auth"."session" ("user_id");
CREATE INDEX "verification_identifier_idx" ON "better_auth"."verification" ("identifier");
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_orderId_data_sl_fkey" FOREIGN KEY ("orderId") REFERENCES "data"("sl");
ALTER TABLE "better_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE CASCADE;
ALTER TABLE "better_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE CASCADE;
