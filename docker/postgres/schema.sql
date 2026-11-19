CREATE SCHEMA "better_auth";

CREATE TABLE "clients" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clients_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clientName" varchar NOT NULL
);

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
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

ALTER TABLE "proposal_documents" ENABLE ROW LEVEL SECURITY;
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
	"usdToBdtRate" numeric(18,2) NOT NULL,
	"sgdToBdtRate" numeric(18,2) NOT NULL,
	"eurToBdtRate" numeric(18,2) NOT NULL,
	"gbpToBdtRate" numeric(18,2) NOT NULL,
	"projectStatus" varchar DEFAULT 'Current' NOT NULL,
	"finalizationDate" date,
	"proposalNotes" text,
	CONSTRAINT "proposals_project_status_check" CHECK ("projectStatus" in ('Current', 'Secured', 'Lost')),
	CONSTRAINT "proposals_value_currency_check" CHECK ("valueCurrency" in ('USD', 'SGD', 'EUR', 'GBP', 'BDT'))
);

ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "systems" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "systems_sl_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"systemName" varchar NOT NULL
);

ALTER TABLE "systems" ENABLE ROW LEVEL SECURITY;
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

CREATE INDEX "proposal_documents_proposal_id_idx" ON "proposal_documents" ("proposalId");
CREATE INDEX "account_userId_idx" ON "better_auth"."account" ("user_id");
CREATE INDEX "session_userId_idx" ON "better_auth"."session" ("user_id");
CREATE INDEX "verification_identifier_idx" ON "better_auth"."verification" ("identifier");
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_proposalId_proposals_sl_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("sl");
ALTER TABLE "better_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE CASCADE;
ALTER TABLE "better_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."user"("id") ON DELETE CASCADE;
