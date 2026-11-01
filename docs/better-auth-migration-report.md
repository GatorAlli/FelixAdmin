# Better Auth migration report

Implemented on November 1, 2026. The application now uses Better Auth for authentication and keeps Supabase for document storage.

## 1. Browser authentication

Added [lib/betterAuth/auth-client.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/lib/betterAuth/auth-client.ts>):

```ts
"use client";

import { createAuthClient } from "better-auth/react";

// Use this app's /api/auth endpoints and Better Auth's built-in tab synchronization.
export const authClient = createAuthClient();
```

Updated [app/page.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/page.tsx>) to:

- Use `authClient.useSession()` to send an already signed-in visitor to `/home`.
- Trim and lowercase the login email.
- Submit through Better Auth:

```ts
const { error } = await authClient.signIn.email({
  email: loginEmail,
  password,
});
```

- Disable the button while signing in, show a specific rate-limit message, catch connection failures, and replace the login URL with `/home` after success.

Updated both [components/view/navbar/navbar.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/components/view/navbar/navbar.tsx>) and [app/components/signOutButton.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/components/signOutButton.tsx>) to call:

```ts
const { error } = await authClient.signOut();
```

**Behavior change:** manual logout now signs out the current browser session and its tabs. Supabase’s previous default also revoked other devices’ sessions. The simpler current-session behavior is intentional; no logout-everywhere helper was added.

## 2. Server session checks

Added [lib/betterAuth/session.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/lib/betterAuth/session.ts>):

```ts
import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Deduplicate checks during one render, never across visitors or requests.
export const requireSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
    // Server Components cannot write cookies. The browser client renews sessions.
    query: { disableRefresh: true },
  });

  if (!session) redirect("/");
  return session;
});

// Pages and actions still check the session before reading or changing data.
export async function requireUser() {
  return (await requireSession()).user;
}
```

The existing configuration disables the session cookie cache, so this validates the stored session. `cache()` shares the result within a server render. `disableRefresh` avoids cookie writes during rendering; the browser session hook handles eligible renewals.

Changed the `requireUser` import in these files; their existing data access and role checks stay in place:

| File | Change |
| --- | --- |
| [app/(pages)/home/page.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/home/page.tsx>) | Better Auth guard import |
| [app/(pages)/home/actions.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/home/actions.ts>) | Better Auth guard import |
| [app/(pages)/summary/page.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/summary/page.tsx>) | Better Auth guard import |
| [app/(pages)/settings/page.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/settings/page.tsx>) | Better Auth guard import |
| [app/(pages)/settings/actions.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/settings/actions.ts>) | Better Auth guard import |
| [app/(pages)/order_form/page.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/order_form/page.tsx>) | Better Auth guard import |
| [app/(pages)/order_form/[edit_slug]/page.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/order_form/[edit_slug]/page.tsx>) | Better Auth guard import |
| [app/(pages)/order_form/actions.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/order_form/actions.ts>) | Better Auth guard import |
| [lib/supabase/document-actions.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/lib/supabase/document-actions.ts>) | Better Auth guard import |

## 3. Existing inactivity timer

Updated [app/(pages)/layout.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/layout.tsx>) to use the Better Auth session ID:

```tsx
const { session } = await requireSession();
const sessionId = session.id;
return <IdleSessionMonitor key={sessionId} sessionId={sessionId}>{children}</IdleSessionMonitor>;
```

Updated [components/auth/idle-session-monitor.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/components/auth/idle-session-monitor.tsx>) to call Better Auth logout and observe `authClient.useSession()`. It redirects after session loss, reloads when the session ID changes, and retains the warning, expiry dialog, shared activity state and retry behavior. Better Auth supplies tab synchronization and refetches on focus/reconnection; no session polling interval was added.

Moved the timer and its tests, with their contents unchanged:

- `lib/supabase/idle-session.ts` → [lib/betterAuth/idle-session.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/lib/betterAuth/idle-session.ts>)
- `lib/supabase/idle-session.test.ts` → [lib/betterAuth/idle-session.test.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/lib/betterAuth/idle-session.test.ts>)

The existing seven-day renewable stored session remains configured. The existing browser timer still warns at 14 minutes and logs out at 15 minutes of inactivity. This remains browser-enforced inactivity, not a new server inactivity system.

## 4. Document storage

Added [lib/supabase/storage-client.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/lib/supabase/storage-client.ts>):

```ts
"use client";

import { createClient } from "@supabase/supabase-js";

// Uploads use server-issued Storage tokens; login belongs to Better Auth.
export const storageClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
```

Updated [app/(pages)/order_form/OrderDocuments.tsx](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/app/(pages)/order_form/OrderDocuments.tsx>) to upload using this client:

```ts
const { error } = await storageClient.storage.from("order-documents")
  .uploadToSignedUrl(prepared.storagePath, prepared.token, row.file, {
    contentType: prepared.mimeType,
  });
```

The server still checks permissions before issuing upload/download tokens. This follows Supabase’s [signed upload API](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl).

## 5. Cleanup and small fixes

Deleted obsolete Supabase Auth files:

- `lib/supabase/auth.ts`
- `lib/supabase/actions.ts`
- `lib/supabase/server.ts`
- `proxy.ts`, which refreshed Supabase Auth cookies

Server pages and actions still validate sessions directly. The production HTTP checks confirmed private, non-cacheable responses for protected pages without the proxy.

Removed unused `@supabase/ssr` and `@supabase/server` dependencies from [package.json](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/package.json>) and updated [package-lock.json](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/package-lock.json>). The package files also contain the earlier security updates; those predate this implementation pass. Kept `@supabase/supabase-js` for Storage.

In the existing [scripts/create-user.ts](</Users/jahinhossain/Files/Projects/Father/Felix Controls Limited/Admin Page/felix-admin/scripts/create-user.ts>), removed the unused `error` import from `console` and replaced the non-null assertion with a runtime check:

```ts
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing.");
```

No new account-provisioning features were added. Existing bcrypt hashing, public sign-up restrictions, rate limiting, database schema, business roles and permission rules were retained. No persistent account data was imported or migrated, and no database grants were changed in this pass.

## 6. Verification

Passed:

- ESLint and TypeScript checks.
- All 22 existing tests, including idle timing, retry behavior, role checks and upload-ticket validation.
- Production build: `npm run build -- --webpack`.
- Unauthenticated redirects from `/home`, `/summary`, `/settings`, `/order_form` and `/order_form/1`.
- Real Postgres/Drizzle integration: incorrect-password rejection, successful login, HTTP-only cookie issuance and stored-session lookup.
- Authenticated `/home` and `/summary` responses with private cache headers.
- Rejection of `/settings` and new-order access for an account without a permission profile. Next.js streamed these redirects in the response body.
- Logout deletes the stored session; replaying its former cookie is rejected.
- Public sign-up remains disabled.
- Signed Storage upload, download and deletion without a Supabase Auth session.
- Login screen validation in the browser, with no browser warnings or errors observed.
- `anon` and `authenticated` both lack `USAGE` on the private `better_auth` schema.

Temporary verification accounts, sessions and the uploaded file were removed. The temporary integration script was also removed.

The full authenticated browser editing flow was not exercised. Server permission tests and HTTP checks passed; the existing idle engine’s timing and retries were verified by its tests.

## 7. Account setup still belongs to you

The final database check found **3 permission profiles and 0 Better Auth login accounts**. Profiles alone cannot sign in. Create your login accounts with the same email addresses as the profiles, and manage roles manually in `public.users` as planned.

The existing optional helper is ready if you want to use it:

```sh
npx tsx scripts/create-user.ts
```

It prompts for credentials; no email/password environment variables are needed. It does not assign permissions. Existing Supabase login sessions cannot authenticate the migrated app; users will need a Better Auth login.

The code is implemented locally. Deployment and permanent account creation were not performed.
