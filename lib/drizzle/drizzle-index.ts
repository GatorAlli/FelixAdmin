import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

export const db = drizzle({
  connection: {
    url: databaseUrl,
    prepare: false,
  },
});
