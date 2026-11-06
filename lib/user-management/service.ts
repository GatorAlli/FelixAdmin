import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, like, sql } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { authOptions } from "@/lib/betterAuth/auth-options";
import { db } from "@/lib/drizzle/drizzle-index";
import * as authSchema from "@/lib/drizzle/auth-schema";
import { users } from "@/lib/drizzle/schema";
import { readInvitation, readUserId, type ManagedUser } from "./validation";
import { requireInvitationEmailConfig } from "./email";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class UserManagementError extends Error {}

async function assertAdmin(transaction: Transaction | typeof db, actorId: string) {
  const [actor] = await transaction.select({ email: authSchema.user.email })
    .from(authSchema.user).where(eq(authSchema.user.id, actorId));
  const profiles = actor ? await transaction.select({ status: users.status }).from(users)
    .where(sql`lower(trim(${users.email})) = ${actor.email.toLowerCase()}`) : [];
  if (profiles.length !== 1 || profiles[0].status !== "admin") {
    throw new UserManagementError("Only admins can manage users.");
  }
}

export async function listManagedUsers(actorId: string): Promise<ManagedUser[]> {
  await assertAdmin(db, actorId);
  const rows = await db.select({ id: authSchema.user.id, name: authSchema.user.name,
    email: authSchema.user.email, access: users.status,
    password: authSchema.account.password,
  }).from(authSchema.user)
    .leftJoin(users, sql`lower(trim(${users.email})) = lower(${authSchema.user.email})`)
    .leftJoin(authSchema.account, and(eq(authSchema.account.userId, authSchema.user.id), eq(authSchema.account.providerId, "credential")))
    .orderBy(
      sql`case ${users.status} when 'admin' then 0 when 'order' then 1 when 'guest' then 2 else 3 end`,
      asc(authSchema.user.name),
      asc(authSchema.user.email),
    );
  // Only these fields cross the server/client boundary. Never serialize hashes.
  return rows.map(({ password, ...row }) => ({ ...row, pending: !password }));
}

// All UI mutations use the same lock and recheck the actor after acquiring it.
export async function changeManagedUser(actorId: string, operation:
  | { kind: "invite"; input: unknown }
  | { kind: "resend" | "remove"; id: unknown }) {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(4604748, 4)`);
    await assertAdmin(transaction, actorId);

    if (operation.kind === "remove") {
      const id = readUserId(operation.id);
      if (id === actorId) throw new UserManagementError("You cannot remove your own account.");
      const [target] = await transaction.select().from(authSchema.user).where(eq(authSchema.user.id, id));
      if (!target) throw new UserManagementError("This user no longer exists.");
      const profiles = await transaction.select().from(users)
        .where(sql`lower(trim(${users.email})) = ${target.email.toLowerCase()}`);
      if (profiles.length > 1) throw new UserManagementError("Duplicate profiles exist for this email. Resolve them before removing this user.");
      if (profiles[0]?.status === "admin") {
        // Count actual login accounts with admin profiles, rather than orphan profiles.
        const admins = await transaction.select({ id: authSchema.user.id }).from(authSchema.user)
          .innerJoin(users, eq(users.email, authSchema.user.email)).where(eq(users.status, "admin"));
        if (new Set(admins.map((admin) => admin.id)).size <= 1) {
          throw new UserManagementError("The last admin cannot be removed.");
        }
      }
      await transaction.delete(authSchema.verification).where(and(
        eq(authSchema.verification.value, id), like(authSchema.verification.identifier, "reset-password:%"),
      ));
      // Account and session foreign keys cascade. Order attribution stays untouched.
      await transaction.delete(authSchema.user).where(eq(authSchema.user.id, id));
      await transaction.delete(users).where(sql`lower(trim(${users.email})) = ${target.email.toLowerCase()}`);
      return null;
    }

    const redirectTo = requireInvitationEmailConfig();
    let target: { id: string; email: string };
    if (operation.kind === "invite") {
      const input = readInvitation(operation.input);
      const existing = await transaction.select({ id: authSchema.user.id }).from(authSchema.user)
        .where(sql`lower(trim(${authSchema.user.email})) = ${input.email}`);
      if (existing.length) throw new UserManagementError("A user with this email already exists. Use Resend invitation if they have not created a password.");
      const profiles = await transaction.select({ id: users.sl }).from(users)
        .where(sql`lower(trim(${users.email})) = ${input.email}`);
      if (profiles.length) throw new UserManagementError("A profile with this email already exists. Resolve it before inviting this user.");
      [target] = await transaction.insert(authSchema.user).values({ name: input.name, email: input.email })
        .returning({ id: authSchema.user.id, email: authSchema.user.email });
      await transaction.insert(users).values({ name: input.name, email: input.email, status: input.access });
      // No credential exists until Better Auth accepts the password-creation token.
    } else {
      const id = readUserId(operation.id);
      const [user] = await transaction.select().from(authSchema.user).where(eq(authSchema.user.id, id));
      if (!user) throw new UserManagementError("This user no longer exists.");
      const credentials = await transaction.select({ password: authSchema.account.password }).from(authSchema.account)
        .where(and(eq(authSchema.account.userId, id), eq(authSchema.account.providerId, "credential")));
      if (credentials.some((credential) => credential.password)) {
        throw new UserManagementError("This user has already created a password.");
      }
      const tokens = await transaction.select({ createdAt: authSchema.verification.createdAt }).from(authSchema.verification)
        .where(and(eq(authSchema.verification.value, id), like(authSchema.verification.identifier, "reset-password:%")));
      if (tokens.some((token) => Date.now() - token.createdAt.getTime() < 60_000)) {
        throw new UserManagementError("Wait one minute before resending this invitation.");
      }
      target = user;
    }
    await transaction.delete(authSchema.verification).where(and(
      eq(authSchema.verification.value, target.id), like(authSchema.verification.identifier, "reset-password:%"),
    ));
    let invitationURL: string | undefined;
    // Capture Better Auth's own single-use token; send only after the DB commits.
    const invitationAuth = betterAuth({
      ...authOptions,
      database: drizzleAdapter(transaction, { provider: "pg", schemaName: "better_auth", schema: authSchema, transaction: true }),
      emailAndPassword: {
        ...authOptions.emailAndPassword,
        sendResetPassword: async ({ url }) => { invitationURL = url; },
      },
    });
    await invitationAuth.api.requestPasswordReset({ body: { email: target.email, redirectTo } });
    if (!invitationURL) throw new Error("Could not generate invitation.");
    return { email: target.email, url: invitationURL, deliveryId: randomUUID() };
  });
}
