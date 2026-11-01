import { input, password as passwordPrompt } from "@inquirer/prompts";
import * as authSchema from "../lib/drizzle/auth-schema";
import { loadEnvConfig } from "@next/env";
import { defineRelations, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { betterAuth } from "better-auth";
import { authOptions } from "@/lib/betterAuth/auth-options";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

const client = postgres(databaseUrl, { prepare: false, max: 1 });
const setupDb = drizzle({
  client,
  relations: { ...defineRelations(authSchema), ...authSchema.authRelations },
});

async function main() {
  // Ask for a display name
  const name = (
    await input({
      message: "Name:",
      validate: (value) => Boolean(value.trim()) || "Enter a name.",
    })
  ).trim();

  const email = (
    await input({
      message: "Email:",
      validate: (value) => Boolean(value.trim()),
    })
  )
    .trim()
    .toLowerCase();

  // Stop before asking for a password if the login already exists
  const existing = await setupDb
    .select({ id: authSchema.user.id })
    .from(authSchema.user)
    .where(eq(authSchema.user.email, email))
    .limit(1);

  if (existing.length) {
    console.info("An account with this email already exists.");
    return;
  }

  const password = await passwordPrompt({
    message: "Password:",
    mask: "*",
    validate: (value) => {
      if (value.length < 8) {
        return "Use at least 8 characters";
      }
      if (Buffer.byteLength(value, "utf8") > 72) {
        return "Use at most 72 bytes";
      }
      return true;
    },
  });

  await passwordPrompt({
    message: "Confirm Password:",
    mask: "*",
    validate: (value) => value === password || "Passwords don't match",
  });

  const setupAuth = betterAuth({
    ...authOptions,

    database: drizzleAdapter(setupDb, {
      provider: "pg",
      schemaName: "better_auth",
      schema: authSchema,
      transaction: true,
    }),

    emailAndPassword: {
      ...authOptions.emailAndPassword,

      disableSignUp: false,

      autoSignIn: false,
    },
  });

  const result = await setupAuth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  console.info("Account created:", result.user.email);
  console.info("User ID:", result.user.id);
}

main()
  .catch((error: unknown) => {
    if (error instanceof Error && error.name === "ExitPromptError") {
      console.info("Account creation cancelled.");
      return;
    }

    // Avoid printing database errors that could include credential values.
    console.error(
      "Account creation failed. Check the input and database configuration.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    // Always close the database connection.
    await client.end();
  });
