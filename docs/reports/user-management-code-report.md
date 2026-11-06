# User management: complete code report

This report contains the final code added or changed during this chat: **3 modified code files, 8 added code files, and 1 added architecture document**.

Tailwind utility classes are excluded by removing `className` attributes from the report copies. The project source files are unchanged. All other code is included; modified files are shown in full so the changes can be understood in context. Temporary test databases, build output, and intermediate revisions are excluded.

## Outcome

Admin-only Settings controls list users, invite users by email, resend pending invitations, and remove accounts. Better Auth handles password creation with expiring, single-use tokens. Removal revokes access while preserving orders and their attribution.

## File inventory

| File                                   | Change   | Purpose                                                                                             |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `app/(pages)/settings/page.tsx`        | Modified | Loads the user list after the existing admin check and renders the user-management table.           |
| `lib/auth.ts`                          | Modified | Enables database transactions in the Better Auth adapter.                                           |
| `lib/betterAuth/auth-options.ts`       | Modified | Sets one-hour token expiry, session revocation on password reset, and reset endpoint rate limiting. |
| `lib/user-management/validation.ts`    | Added    | Defines roles, browser-safe user data, and server-side input validation.                            |
| `lib/user-management/service.ts`       | Added    | Implements admin authorization, transactional invitation creation, resending, and removal.          |
| `lib/user-management/email.ts`         | Added    | Sends password-creation emails through Resend using server environment variables.                   |
| `app/(pages)/settings/user-actions.ts` | Added    | Connects authenticated browser requests to the backend and reports delivery failures.               |
| `app/(pages)/settings/UsersTable.tsx`  | Added    | Provides the user table, invitation form, resend action, and removal confirmation.                  |
| `app/set-password/page.tsx`            | Added    | Reads the invitation callback parameters and renders the password-creation form.                    |
| `app/set-password/SetPasswordForm.tsx` | Added    | Validates password confirmation and submits the token and chosen password to Better Auth.           |
| `lib/user-management/service.test.ts`  | Added    | Tests real database behavior and simulated email delivery without sending actual emails.            |
| `docs/user-management.md`              | Added    | Documents the architecture, configuration, operational limits, and integration-test command.        |

## Validation and configuration

TypeScript, lint, the database integration suite, the existing order-access and idle-session tests, and the Webpack production build passed. The default Turbopack build hit a local process-permission error. Actual Resend delivery was not tested; the test suite simulates delivery success and failure.

Configure `RESEND_API_KEY`, `RESEND_EMAIL`, and `BETTER_AUTH_URL` on the server. The sender domain must be verified in Resend. No database migration was added.

## Complete code

### app/(pages)/settings/page.tsx

**Modified.** Loads the user list after the existing admin check and renders the user-management table.

```tsx
import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getOrderDatalists } from "@/lib/drizzle/order-datalists";
import SettingsLists from "./SettingsLists";
import { Manrope } from "next/font/google";
import { listManagedUsers } from "@/lib/user-management/service";
import UsersTable from "./UsersTable";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Only admins can load the editable supplier, customer and expense lists.
export default async function Settings() {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  if (profile?.status !== "admin") redirect("/home");

  const [datalists, managedUsers] = await Promise.all([
    getOrderDatalists(),
    listManagedUsers(user.id),
  ]);
  return (
    <div>
      <Navbar />
      <SettingsLists {...datalists} />
      <UsersTable users={managedUsers} currentUserId={user.id} />
    </div>
  );
}
```

### lib/auth.ts

**Modified.** Enables database transactions in the Better Auth adapter.

```ts
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
    transaction: true,
  }),

  // Allow authentication calls in Server Actions to set cookies.
  plugins: [nextCookies()],
});
```

### lib/betterAuth/auth-options.ts

**Modified.** Sets one-hour token expiry, session revocation on password reset, and reset endpoint rate limiting.

```ts
import { BetterAuthOptions } from "better-auth";
import { hash, compare } from "bcryptjs";

export const authOptions = {
  appName: "Felix Controls Limited",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: async (password: string) => {
        if (Buffer.byteLength(password, "utf8") > 72) {
          throw new Error("Password must be at most 72 bytes");
        }
        return hash(password, 12);
      },
      verify: async ({
        hash: storedHash,
        password,
      }: {
        hash: string;
        password: string;
      }) => compare(password, storedHash),
    },
  },
  user: {
    changeEmail: { enabled: false },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,

    cookieCache: {
      enabled: false,
    },
  },

  advanced: {
    database: {
      generateId: "uuid",
    },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
      "/reset-password": { window: 60, max: 5 },
    },
  },
} satisfies BetterAuthOptions;
```

### lib/user-management/validation.ts

**Added.** Defines roles, browser-safe user data, and server-side input validation.

```ts
export const accessLabels = {
  admin: "Admin",
  order: "Order manager",
  guest: "Guest",
} as const;

export type UserAccess = keyof typeof accessLabels;
export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  access: string | null;
  pending: boolean;
};

export function readInvitation(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Enter the user details.");
  const { name, email, access } = input as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
    throw new Error("Enter a username of at most 200 characters.");
  }
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new Error("Enter a valid email address.");
  }
  if (typeof access !== "string" || !Object.hasOwn(accessLabels, access)) {
    throw new Error("Choose Admin, Order manager, or Guest access.");
  }
  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    access: access as UserAccess,
  };
}

export function readUserId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Invalid user.");
  }
  return value;
}
```

### lib/user-management/service.ts

**Added.** Implements admin authorization, transactional invitation creation, resending, and removal.

```ts
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

async function assertAdmin(
  transaction: Transaction | typeof db,
  actorId: string,
) {
  const [actor] = await transaction
    .select({ email: authSchema.user.email })
    .from(authSchema.user)
    .where(eq(authSchema.user.id, actorId));
  const profiles = actor
    ? await transaction
        .select({ status: users.status })
        .from(users)
        .where(sql`lower(trim(${users.email})) = ${actor.email.toLowerCase()}`)
    : [];
  if (profiles.length !== 1 || profiles[0].status !== "admin") {
    throw new UserManagementError("Only admins can manage users.");
  }
}

export async function listManagedUsers(
  actorId: string,
): Promise<ManagedUser[]> {
  await assertAdmin(db, actorId);
  const rows = await db
    .select({
      id: authSchema.user.id,
      name: authSchema.user.name,
      email: authSchema.user.email,
      access: users.status,
      password: authSchema.account.password,
    })
    .from(authSchema.user)
    .leftJoin(
      users,
      sql`lower(trim(${users.email})) = lower(${authSchema.user.email})`,
    )
    .leftJoin(
      authSchema.account,
      and(
        eq(authSchema.account.userId, authSchema.user.id),
        eq(authSchema.account.providerId, "credential"),
      ),
    )
    .orderBy(asc(authSchema.user.name), asc(authSchema.user.email));
  // Only these fields cross the server/client boundary. Never serialize hashes.
  return rows.map(({ password, ...row }) => ({ ...row, pending: !password }));
}

// All UI mutations use the same lock and recheck the actor after acquiring it.
export async function changeManagedUser(
  actorId: string,
  operation:
    | { kind: "invite"; input: unknown }
    | { kind: "resend" | "remove"; id: unknown },
) {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(4604748, 4)`);
    await assertAdmin(transaction, actorId);

    if (operation.kind === "remove") {
      const id = readUserId(operation.id);
      if (id === actorId)
        throw new UserManagementError("You cannot remove your own account.");
      const [target] = await transaction
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, id));
      if (!target) throw new UserManagementError("This user no longer exists.");
      const profiles = await transaction
        .select()
        .from(users)
        .where(
          sql`lower(trim(${users.email})) = ${target.email.toLowerCase()}`,
        );
      if (profiles.length > 1)
        throw new UserManagementError(
          "Duplicate profiles exist for this email. Resolve them before removing this user.",
        );
      if (profiles[0]?.status === "admin") {
        // Count actual login accounts with admin profiles, rather than orphan profiles.
        const admins = await transaction
          .select({ id: authSchema.user.id })
          .from(authSchema.user)
          .innerJoin(users, eq(users.email, authSchema.user.email))
          .where(eq(users.status, "admin"));
        if (new Set(admins.map((admin) => admin.id)).size <= 1) {
          throw new UserManagementError("The last admin cannot be removed.");
        }
      }
      await transaction
        .delete(authSchema.verification)
        .where(
          and(
            eq(authSchema.verification.value, id),
            like(authSchema.verification.identifier, "reset-password:%"),
          ),
        );
      // Account and session foreign keys cascade. Order attribution stays untouched.
      await transaction
        .delete(authSchema.user)
        .where(eq(authSchema.user.id, id));
      await transaction
        .delete(users)
        .where(
          sql`lower(trim(${users.email})) = ${target.email.toLowerCase()}`,
        );
      return null;
    }

    const redirectTo = requireInvitationEmailConfig();
    let target: { id: string; email: string };
    if (operation.kind === "invite") {
      const input = readInvitation(operation.input);
      const existing = await transaction
        .select({ id: authSchema.user.id })
        .from(authSchema.user)
        .where(sql`lower(trim(${authSchema.user.email})) = ${input.email}`);
      if (existing.length)
        throw new UserManagementError(
          "A user with this email already exists. Use Resend invitation if they have not created a password.",
        );
      const profiles = await transaction
        .select({ id: users.sl })
        .from(users)
        .where(sql`lower(trim(${users.email})) = ${input.email}`);
      if (profiles.length)
        throw new UserManagementError(
          "A profile with this email already exists. Resolve it before inviting this user.",
        );
      [target] = await transaction
        .insert(authSchema.user)
        .values({ name: input.name, email: input.email })
        .returning({ id: authSchema.user.id, email: authSchema.user.email });
      await transaction
        .insert(users)
        .values({ name: input.name, email: input.email, status: input.access });
      // No credential exists until Better Auth accepts the password-creation token.
    } else {
      const id = readUserId(operation.id);
      const [user] = await transaction
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, id));
      if (!user) throw new UserManagementError("This user no longer exists.");
      const credentials = await transaction
        .select({ password: authSchema.account.password })
        .from(authSchema.account)
        .where(
          and(
            eq(authSchema.account.userId, id),
            eq(authSchema.account.providerId, "credential"),
          ),
        );
      if (credentials.some((credential) => credential.password)) {
        throw new UserManagementError(
          "This user has already created a password.",
        );
      }
      const tokens = await transaction
        .select({ createdAt: authSchema.verification.createdAt })
        .from(authSchema.verification)
        .where(
          and(
            eq(authSchema.verification.value, id),
            like(authSchema.verification.identifier, "reset-password:%"),
          ),
        );
      if (
        tokens.some((token) => Date.now() - token.createdAt.getTime() < 60_000)
      ) {
        throw new UserManagementError(
          "Wait one minute before resending this invitation.",
        );
      }
      target = user;
    }
    await transaction
      .delete(authSchema.verification)
      .where(
        and(
          eq(authSchema.verification.value, target.id),
          like(authSchema.verification.identifier, "reset-password:%"),
        ),
      );
    let invitationURL: string | undefined;
    // Capture Better Auth's own single-use token; send only after the DB commits.
    const invitationAuth = betterAuth({
      ...authOptions,
      database: drizzleAdapter(transaction, {
        provider: "pg",
        schemaName: "better_auth",
        schema: authSchema,
        transaction: true,
      }),
      emailAndPassword: {
        ...authOptions.emailAndPassword,
        sendResetPassword: async ({ url }) => {
          invitationURL = url;
        },
      },
    });
    await invitationAuth.api.requestPasswordReset({
      body: { email: target.email, redirectTo },
    });
    if (!invitationURL) throw new Error("Could not generate invitation.");
    return {
      email: target.email,
      url: invitationURL,
      deliveryId: randomUUID(),
    };
  });
}
```

### lib/user-management/email.ts

**Added.** Sends password-creation emails through Resend using server environment variables.

```ts
import "server-only";

export function requireInvitationEmailConfig() {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_EMAIL) {
    throw new Error(
      "Set RESEND_API_KEY and RESEND_EMAIL before inviting users.",
    );
  }
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("Set BETTER_AUTH_URL before inviting users.");
  return new URL("/set-password", baseURL).href;
}

export async function sendInvitationEmail(invitation: {
  email: string;
  url: string;
  deliveryId: string;
}) {
  requireInvitationEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": invitation.deliveryId,
    },
    body: JSON.stringify({
      from: process.env.RESEND_EMAIL,
      to: [invitation.email],
      subject: "Create your Felix Controls password",
      text: `You have been invited to the Felix Controls Order Workspace.\n\nCreate your password using this link:\n${invitation.url}\n\nThis link expires in one hour and can be used once. If it expires, ask your administrator to resend the invitation.\n\nIf you were not expecting this invitation, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  // Never expose provider responses, API keys, or invitation tokens in logs.
  if (!response.ok) throw new Error("Invitation delivery failed.");
}
```

### app/(pages)/settings/user-actions.ts

**Added.** Connects authenticated browser requests to the backend and reports delivery failures.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/betterAuth/session";
import {
  changeManagedUser,
  UserManagementError,
} from "@/lib/user-management/service";
import { sendInvitationEmail } from "@/lib/user-management/email";
import { readInvitation, readUserId } from "@/lib/user-management/validation";

async function run(operation: Parameters<typeof changeManagedUser>[1]) {
  const actor = await requireUser();
  let invitation;
  try {
    invitation = await changeManagedUser(actor.id, operation);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof UserManagementError
          ? error.message
          : "Could not update users. Check the details and server email configuration, then try again.",
    };
  }
  revalidatePath("/settings");
  if (invitation) {
    try {
      await sendInvitationEmail(invitation);
    } catch {
      return {
        ok: false,
        message:
          "User saved, but the invitation could not be sent. Check Resend configuration, then resend the invitation after one minute.",
      };
    }
  }
  return {
    ok: true,
    message: invitation
      ? "Invitation sent. The user can create their password from the email."
      : "User removed. Their active sessions have been revoked.",
  };
}

export async function inviteUser(input: unknown) {
  try {
    readInvitation(input);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Invalid user details.",
    };
  }
  return run({ kind: "invite", input });
}

export async function resendUserInvitation(id: unknown) {
  try {
    readUserId(id);
  } catch {
    return { ok: false, message: "Invalid user." };
  }
  return run({ kind: "resend", id });
}

export async function removeUser(id: unknown) {
  try {
    readUserId(id);
  } catch {
    return { ok: false, message: "Invalid user." };
  }
  return run({ kind: "remove", id });
}
```

### app/(pages)/settings/UsersTable.tsx

**Added.** Provides the user table, invitation form, resend action, and removal confirmation.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accessLabels,
  type ManagedUser,
} from "@/lib/user-management/validation";
import { inviteUser, removeUser, resendUserInvitation } from "./user-actions";

export default function UsersTable({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function perform(
    action: () => Promise<{ ok: boolean; message: string }>,
    onSuccess?: () => void,
  ) {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await action();
        setMessage(result.message);
        setError(!result.ok);
        if (result.ok) onSuccess?.();
        router.refresh();
      } catch {
        setError(true);
        setMessage("Could not update users. Please try again.");
      }
    });
  }

  return (
    <section aria-labelledby="users-heading">
      <div>
        <h2 id="users-heading">Users</h2>
        <Button
          type="button"
          disabled={pending}
          aria-expanded={adding}
          aria-controls="add-user-form"
          onClick={() => setAdding(!adding)}
        >
          {adding ? "Cancel" : "Add User"}
        </Button>
      </div>
      {adding && (
        <form
          id="add-user-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            perform(
              () =>
                inviteUser({
                  name: values.get("name"),
                  email: values.get("email"),
                  access: values.get("access"),
                }),
              () => {
                form.reset();
                setAdding(false);
              },
            );
          }}
        >
          <fieldset disabled={pending}>
            <div>
              <Label htmlFor="new-user-name">Username</Label>
              <Input
                id="new-user-name"
                name="name"
                autoComplete="off"
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                name="email"
                type="email"
                autoComplete="off"
                required
                maxLength={254}
              />
            </div>
            <div>
              <Label htmlFor="new-user-access">Access</Label>
              <select id="new-user-access" name="access" defaultValue="guest">
                {Object.entries(accessLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p>
              The user will receive an email to create their password. The link
              expires in one hour.
            </p>
            <Button type="submit">
              {pending ? "Sending…" : "Send invitation"}
            </Button>
          </fieldset>
        </form>
      )}
      <div>
        <table>
          <caption>Workspace users and their access permissions</caption>
          <thead>
            <tr>
              {["Username", "Email", "Access", "Status", "Actions"].map(
                (heading) => (
                  <th key={heading} scope="col">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.name}
                  {user.id === currentUserId && <span>(you)</span>}
                </td>
                <td>{user.email}</td>
                <td>
                  {user.access && Object.hasOwn(accessLabels, user.access)
                    ? accessLabels[user.access as keyof typeof accessLabels]
                    : "No access"}
                </td>
                <td>{user.pending ? "Awaiting password" : "Active"}</td>
                <td>
                  <div>
                    {user.pending && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          perform(() => resendUserInvitation(user.id))
                        }
                      >
                        Resend invitation
                      </Button>
                    )}
                    {user.id !== currentUserId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        aria-label={`Remove ${user.name}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove ${user.name} (${user.email})? They will lose access immediately. Existing orders will be kept.`,
                            )
                          )
                            perform(() => removeUser(user.id));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && <p role={error ? "alert" : "status"}>{message}</p>}
    </section>
  );
}
```

### app/set-password/page.tsx

**Added.** Reads the invitation callback parameters and renders the password-creation form.

```tsx
import SetPasswordForm from "./SetPasswordForm";

export const metadata = { title: "Create password | Felix Controls" };

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const token =
    typeof params.token === "string" && !params.error ? params.token : "";
  return (
    <main>
      <SetPasswordForm token={token} />
    </main>
  );
}
```

### app/set-password/SetPasswordForm.tsx

**Added.** Validates password confirmation and submits the token and chosen password to Better Auth.

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/betterAuth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section>
      <h1>Create your password</h1>
      {complete ? (
        <>
          <p>Your password is ready. You can now sign in to Felix Controls.</p>
          <Link href="/">Go to sign in</Link>
        </>
      ) : !token ? (
        <p role="alert">
          This invitation is invalid or has expired. Ask your administrator to
          resend it.
        </p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            const values = new FormData(event.currentTarget);
            const password = String(values.get("password") ?? "");
            if (password !== values.get("confirmation")) {
              setMessage("Passwords do not match.");
              return;
            }
            if (
              password.length < 8 ||
              new TextEncoder().encode(password).length > 72
            ) {
              setMessage("Use at least 8 characters and at most 72 bytes.");
              return;
            }
            setPending(true);
            setMessage("");
            try {
              const { error } = await authClient.resetPassword({
                token,
                newPassword: password,
              });
              if (error)
                setMessage(
                  error.status === 429
                    ? "Too many attempts. Wait one minute and try again."
                    : "Could not create your password. The invitation may have expired or already been used. Ask your administrator to resend it.",
                );
              else setComplete(true);
            } catch {
              setMessage("Could not connect. Please try again.");
            } finally {
              setPending(false);
            }
          }}
        >
          <p>Use at least 8 characters to secure your account.</p>
          <fieldset disabled={pending}>
            <div>
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
              />
            </div>
            <Button type="submit">
              {pending ? "Saving…" : "Create password"}
            </Button>
          </fieldset>
          {message && <p role="alert">{message}</p>}
        </form>
      )}
    </section>
  );
}
```

### lib/user-management/service.test.ts

**Added.** Tests real database behavior and simulated email delivery without sending actual emails.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import * as nodeModule from "node:module";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

// Next normally aliases this marker. Tests exercise the actual server service.
// registerHooks requires Node >=22.15; the application still uses Node 20 types.
type Resolve = (specifier: string, context: object) => { url: string };
const { registerHooks } = nodeModule as typeof nodeModule & {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: object,
      next: Resolve,
    ) => { url: string };
  }) => unknown;
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return nextResolve("next/dist/compiled/server-only/empty.js", context);
    return nextResolve(specifier, context);
  },
});

const testURL = process.env.USER_MANAGEMENT_TEST_DATABASE_URL;

test(
  "admin invitations, password creation, and removal preserve access boundaries",
  { skip: !testURL },
  async () => {
    // This suite installs tables only into an explicitly named disposable database.
    assert.ok(testURL);
    assert.match(
      new URL(testURL).pathname,
      /^\/felix_user_management_[a-z_]+$/,
    );
    process.env.DATABASE_URL = testURL;
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.BETTER_AUTH_SECRET =
      "isolated-test-secret-with-at-least-32-characters";
    process.env.RESEND_API_KEY = "test-key-no-email-is-sent";
    process.env.RESEND_EMAIL = "Felix Test <test@example.com>";
    const client = postgres(testURL, { prepare: false });
    const { db } = await import("@/lib/drizzle/drizzle-index");
    try {
      await client.unsafe(await readFile("docker/postgres/schema.sql", "utf8"));
      const { changeManagedUser, listManagedUsers } = await import("./service");
      const { auth } = await import("@/lib/auth");
      const { sendInvitationEmail } = await import("./email");
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async (url, options) => {
          assert.equal(url, "https://api.resend.com/emails");
          const email = JSON.parse(String(options?.body));
          assert.equal(email.from, process.env.RESEND_EMAIL);
          assert.deepEqual(email.to, ["recipient@example.com"]);
          assert.ok(email.text.includes("https://example.com/invitation"));
          return new Response("{}", { status: 200 });
        };
        const email = {
          email: "recipient@example.com",
          url: "https://example.com/invitation",
          deliveryId: randomUUID(),
        };
        await sendInvitationEmail(email);
        globalThis.fetch = async () =>
          new Response("provider error", { status: 503 });
        await assert.rejects(sendInvitationEmail(email), /delivery failed/);
      } finally {
        globalThis.fetch = originalFetch;
      }
      const adminId = randomUUID();
      const guestId = randomUUID();
      await client`insert into better_auth.user (id, name, email) values (${adminId}, 'Admin', 'admin@example.com'), (${guestId}, 'Guest', 'guest@example.com')`;
      await client`insert into users (name, email, status) values ('Admin', 'admin@example.com', 'admin'), ('Guest', 'guest@example.com', 'guest')`;
      const input = {
        name: "New Manager",
        email: " MANAGER@example.com ",
        access: "order",
      };
      await assert.rejects(
        changeManagedUser(guestId, { kind: "invite", input }),
        /Only admins/,
      );
      await assert.rejects(listManagedUsers(guestId), /Only admins/);
      await assert.rejects(
        changeManagedUser(adminId, { kind: "remove", id: adminId }),
        /own account/,
      );
      await assert.rejects(
        changeManagedUser(adminId, {
          kind: "invite",
          input: { ...input, access: "superadmin" },
        }),
        /Choose Admin/,
      );
      const invitation = await changeManagedUser(adminId, {
        kind: "invite",
        input,
      });
      assert.ok(invitation);
      assert.equal(invitation.email, "manager@example.com");
      let manager = (await listManagedUsers(adminId)).find(
        (user) => user.email === invitation.email,
      )!;
      assert.ok(manager.pending);
      assert.equal(manager.access, "order");
      assert.equal(Object.hasOwn(manager, "password"), false);
      await assert.rejects(
        auth.api.signInEmail({
          body: { email: invitation.email, password: "not-a-password" },
        }),
      );
      await assert.rejects(
        changeManagedUser(adminId, { kind: "invite", input }),
        /already exists/,
      );
      await assert.rejects(
        changeManagedUser(adminId, { kind: "resend", id: manager.id }),
        /one minute/,
      );
      await client`update better_auth.verification set created_at = now() - interval '2 minutes' where value = ${manager.id}`;
      const replacement = await changeManagedUser(adminId, {
        kind: "resend",
        id: manager.id,
      });
      assert.ok(replacement);
      const token = (url: string) => new URL(url).pathname.split("/").pop()!;
      const callback = await auth.handler(new Request(replacement.url));
      assert.equal(callback.status, 302);
      const destination = new URL(callback.headers.get("location")!);
      assert.equal(destination.pathname, "/set-password");
      assert.equal(
        destination.searchParams.get("token"),
        token(replacement.url),
      );
      await assert.rejects(
        auth.api.resetPassword({
          body: {
            token: token(invitation.url),
            newPassword: "Test password 123",
          },
        }),
      );
      await auth.api.resetPassword({
        body: {
          token: token(replacement.url),
          newPassword: "Test password 123",
        },
      });
      await assert.rejects(
        auth.api.resetPassword({
          body: {
            token: token(replacement.url),
            newPassword: "Different password 123",
          },
        }),
      );
      manager = (await listManagedUsers(adminId)).find(
        (user) => user.id === manager.id,
      )!;
      assert.equal(manager.pending, false);
      await assert.rejects(
        changeManagedUser(adminId, { kind: "resend", id: manager.id }),
        /already created/,
      );
      const signedIn = await auth.api.signInEmail({
        body: { email: invitation.email, password: "Test password 123" },
      });
      assert.ok(signedIn.token);
      await client`insert into data ("createdBy", "felixOrderRef") values ('New Manager', 'KEEP-001')`;
      await assert.rejects(
        changeManagedUser(guestId, { kind: "remove", id: manager.id }),
        /Only admins/,
      );
      await changeManagedUser(adminId, { kind: "remove", id: manager.id });
      assert.equal(
        (
          await client`select * from better_auth.session where user_id = ${manager.id}`
        ).length,
        0,
      );
      assert.equal(
        (
          await client`select * from better_auth.account where user_id = ${manager.id}`
        ).length,
        0,
      );
      assert.equal(
        (await client`select * from users where email = ${invitation.email}`)
          .length,
        0,
      );
      assert.equal(
        (await client`select * from data where "felixOrderRef" = 'KEEP-001'`)
          .length,
        1,
      );
      await assert.rejects(
        auth.api.signInEmail({
          body: { email: invitation.email, password: "Test password 123" },
        }),
      );

      const expired = await changeManagedUser(adminId, {
        kind: "invite",
        input: {
          name: "Expired",
          email: "expired@example.com",
          access: "guest",
        },
      });
      assert.ok(expired);
      await client`update better_auth.verification set expires_at = now() - interval '1 minute' where identifier = ${`reset-password:${token(expired.url)}`}`;
      await assert.rejects(
        auth.api.resetPassword({
          body: { token: token(expired.url), newPassword: "Test password 123" },
        }),
      );
      const pending = (await listManagedUsers(adminId)).find(
        (user) => user.email === expired.email,
      )!;
      await changeManagedUser(adminId, { kind: "remove", id: pending.id });
      assert.equal(
        (
          await client`select * from better_auth.verification where value = ${pending.id}`
        ).length,
        0,
      );
      await assert.rejects(
        changeManagedUser(pending.id, { kind: "invite", input }),
        /Only admins/,
      );

      const simultaneous = await Promise.allSettled([
        changeManagedUser(adminId, {
          kind: "invite",
          input: { ...input, email: "race@example.com" },
        }),
        changeManagedUser(adminId, {
          kind: "invite",
          input: { ...input, email: "race@example.com" },
        }),
      ]);
      assert.equal(
        simultaneous.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        (await client`select * from users where email = 'race@example.com'`)
          .length,
        1,
      );
    } finally {
      await client.end();
      await db.$client.end();
    }
  },
);
```

### docs/user-management.md

**Added.** Documents the architecture, configuration, operational limits, and integration-test command.

````markdown
# User management

Settings loads the user table only after checking the signed-in admin's database
profile. Every user action repeats authorization inside a transaction after
acquiring the shared user-management lock. Roles remain in `public.users`:
`admin`, `order` (Order manager), and `guest`. Better Auth owns logins and sessions.

Adding a user atomically creates a login without credentials, its role profile,
and a Better Auth password-reset token. The recipient creates their first password
on `/set-password`. Tokens expire in one hour, are consumed once, and are never
returned to the admin's browser. Public registration stays disabled.

Resend delivers email after commit. Delivery failure leaves a pending account
with a visible retry action. Resending is limited to once a minute, invalidates
the old link, and is available only before a password has been set. Email delivery
and the database cannot commit atomically; an admin can retry a failed delivery.
For larger deployments, replace the manual retry with a durable email outbox.

Removal atomically deletes the login, its sessions and credentials, its profile,
and outstanding password tokens. Orders, documents, and author attribution stay
intact. Self-removal and last-admin removal are rejected. No database migration
is required. Other tools that edit profiles directly must honor the same lock.

Configure these server environment variables:

- `RESEND_API_KEY`: Resend API key with sending access.
- `RESEND_EMAIL`: sender address on a domain verified in Resend, optionally
  `Felix Controls <accounts@example.com>`.
- `BETTER_AUTH_URL`: the externally reachable application origin. Invitation
  callbacks are built from this setting, never from client input.

The Resend domain must be verified before invitations can be delivered. Local
development links are reachable only from computers that can access that origin.

Run the integration test against a new, empty disposable Postgres database named
`felix_user_management_check` (or another `felix_user_management_` name):

```sh
USER_MANAGEMENT_TEST_DATABASE_URL=postgres://.../felix_user_management_check node --import tsx --test lib/user-management/service.test.ts
```

The test installs the existing schema and exercises permissions, pending logins,
password creation, expired and reused links, concurrent invitations, deletion,
session revocation, and preserved orders. It does not send email.
The integration test requires Node 22.15 or newer for its module loader hook.
````
