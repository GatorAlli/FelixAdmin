import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to the project root .env file.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/drizzle/schema.ts",
  schemaFilter: ["public"],
  out: "./lib/drizzle/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
});
