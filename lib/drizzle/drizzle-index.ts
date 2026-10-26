import "server-only";

import { defineRelations } from "drizzle-orm";
import * as authSchema from "./auth-schema";
import { drizzle } from "drizzle-orm/postgres-js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Open up the .env file and add DATABASE_URL=...",
  );
}

const baseRelations = defineRelations(authSchema);

export const db = drizzle({
  connection: { url: databaseUrl, prepare: false },
  relations: {
    ...baseRelations,
    ...authSchema.authRelations,
  },
});
