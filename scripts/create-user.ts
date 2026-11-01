import { input, select, password as passwordPrompt } from "@inquirer/prompts";
import * as authSchema from "../lib/drizzle/auth-schema";
import { users } from "../lib/drizzle/schema";
import { loadEnvConfig } from "@next/env";
import { defineRelations, eq, sql } from "drizzle-orm";
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
      validate: (value) => Boolean(value.trim()) || "Enter an email.",
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

  const permission = await select({
    message: "Permission:",
    default: "guest",
    choices: [
      { name: "Read only", value: "guest", description: "View orders and download documents." },
      { name: "Order manager", value: "order", description: "Create orders and edit orders with manager access enabled." },
      { name: "Admin", value: "admin", description: "Edit all orders, manage access and change Settings." },
    ],
  });

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

  // Save credentials and the application profile as one unit.
  const result = await setupDb.transaction(async (transaction) => {
    const setupAuth = betterAuth({
      ...authOptions,

      database: drizzleAdapter(transaction, {
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

    // Reuse a manually entered profile, including mixed-case or padded emails.
    const profiles = await transaction.select({ sl: users.sl }).from(users)
      .where(sql`lower(trim(${users.email})) = ${email}`);
    if (profiles.length > 1) {
      throw new Error("Multiple profiles have this email. Resolve duplicates first.");
    }
    const profile = { name, email, status: permission };
    if (profiles.length) {
      await transaction.update(users).set(profile).where(eq(users.sl, profiles[0].sl));
    } else {
      await transaction.insert(users).values(profile);
    }
    return result;
  });

  console.info("Account created:", result.user.email);
  console.info("User ID:", result.user.id);
  console.info("Profile saved. Permission:", permission);
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
