import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "./betterAuth/auth-options";
import { db } from "./drizzle/drizzle-index";
import * as authSchema from "./drizzle/auth-schema";

export const auth = betterAuth({
  ...authOptions,

  database: drizzleAdapter(db, {
    provider: "pg",
    schemaName: "better_auth",
    schema: authSchema, // Map authentication models to generated Drizzle tables.
  }),

  // Allow authentication calls in Server Actions to set cookies.
  plugins: [nextCookies()],
});
