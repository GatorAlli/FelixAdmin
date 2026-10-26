import { loadEnvConfig } from "@next/env";

import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

import { betterAuth } from "better-auth";
import { authOptions } from "./auth-options";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Open up the .env file and add DATABASE_URL=...",
  );
}
const cliDb = drizzle({
  connection: {
    url: databaseUrl,
    prepare: false,
  },
});

export const auth = betterAuth({
  ...authOptions,
  database: drizzleAdapter(cliDb, {
    provider: "pg",
    schemaName: "better_auth",
  }),
});
