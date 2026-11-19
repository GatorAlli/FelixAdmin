CREATE SCHEMA "better_auth";
--> statement-breakpoint
CREATE TABLE "clients" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clients_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clientName" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proposal_documents" (
	"id" uuid PRIMARY KEY,
	"proposalId" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"storagePath" text NOT NULL UNIQUE,
	"mimeType" varchar(100) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"uploadedBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "proposals" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "proposals_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"referenceNumber" varchar NOT NULL UNIQUE,
	"createdBy" varchar NOT NULL,
	"createdDate" date NOT NULL,
	"lastEditedBy" varchar,
	"lastEditedAt" timestamp with time zone,
	"proposalManagerAccess" boolean DEFAULT true NOT NULL,
	"projectName" varchar NOT NULL,
	"clientName" varchar NOT NULL,
	"endUser" varchar,
	"consultant" varchar,
	"system" varchar,
	"valueOriginal" numeric(18,2),
	"valueCurrency" varchar,
	"valueBdt" numeric(18,2),
	"gbpToUsdRate" numeric(18,2) NOT NULL,
	"eurToUsdRate" numeric(18,2) NOT NULL,
	"usdToSgdRate" numeric(18,2) NOT NULL,
	"usdToBdtRate" numeric(18,2) NOT NULL,
	"projectStatus" varchar DEFAULT 'Current' NOT NULL,
	"finalizationDate" date,
	"proposalNotes" text,
	CONSTRAINT "proposals_project_status_check" CHECK ("projectStatus" in ('Current', 'Secured', 'Lost')),
	CONSTRAINT "proposals_value_currency_check" CHECK ("valueCurrency" in ('USD', 'SGD', 'EUR', 'GBP', 'BDT'))
);
--> statement-breakpoint
ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "systems" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "systems_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"systemName" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "systems" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar,
	"email" varchar,
	"status" varchar
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "better_auth"."rate_limit" (
	"id" uuid PRIMARY KEY,
	"key" text NOT NULL UNIQUE,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "better_auth"."user" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "better_auth"."verification" (
	"id" uuid PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "proposal_documents_proposal_id_idx" ON "proposal_documents" ("proposalId");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "better_auth"."account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "better_auth"."session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "better_auth"."verification" ("identifier");--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_proposalId_proposals_sl_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("sl");--> statement-breakpoint
ALTER TABLE "better_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "better_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE CASCADE;