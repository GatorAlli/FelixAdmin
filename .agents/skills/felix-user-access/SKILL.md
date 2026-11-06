---
name: felix-user-access
description: "Change Felix Controls login, admin permissions, order-manager access, user invitation or removal, password creation, Resend delivery, or idle-session behavior using the existing Better Auth and profile model."
---

# Felix user access

Paths below are relative to the repository root. This app uses Better Auth plus application profiles; it does not currently use the Better Auth admin or organization plugin.

## Read the relevant sources

- Authentication: `lib/auth.ts`, `lib/betterAuth/auth-options.ts`, `lib/betterAuth/auth-client.ts`, `lib/betterAuth/session.ts`, and `lib/drizzle/auth-schema.ts`.
- Roles and order access: `lib/drizzle/schema.ts`, `lib/drizzle/order-access.ts`, `app/(pages)/home/actions.ts`, and `app/(pages)/order_form/actions.ts`.
- User management: `lib/user-management/`, `app/(pages)/settings/user-actions.ts`, `app/(pages)/settings/UsersTable.tsx`, and `docs/user-management.md`.
- Password creation: `app/set-password/page.tsx` and `app/set-password/SetPasswordForm.tsx`.
- Idle logout: `lib/betterAuth/idle-session.ts`, `components/auth/idle-session-monitor.tsx`, and `app/(pages)/layout.tsx`.
- CLI provisioning: `scripts/create-user.ts`. It currently creates an initial password directly; it is separate from browser invitations.

## Access model

- `better_auth.user` owns login identity; `public.users` owns profile name and status. Profiles currently link by email, not auth UUID. Management normalizes email and rejects ambiguous profiles. Do not assume a foreign key connects the two tables.
- Status values are `admin`, `order` (Order manager), and `guest`. Roles come from the current database profile, never client fields or a cached browser session.
- `requireUser` authenticates a request; it does not authorize admin access. Check sensitive reads and every mutation server-side. Settings currently redirects non-admins before rendering its controls.
- User-management mutations share advisory lock `(4604748, 4)` and recheck the actor after acquiring it. Preserve transaction boundaries for login, profile, and token writes. Account and session foreign keys cascade on login deletion.
- Removal blocks self-removal and last-admin removal, deletes outstanding reset tokens, and preserves orders, documents, and attribution. Cookie caching is disabled; avoid introducing stale authorization or session caches.

## Invitation contract

- Public sign-up stays disabled. Browser invitations create a login and role without a credential; the invitee cannot sign in until choosing a password.
- The transaction-bound Better Auth instance generates a password-reset token. Capture the email URL and send only after commit; do not expose it to the admin browser or logs.
- Tokens expire after one hour and are consumed by Better Auth. The callback destination is `/set-password`, built from server `BETTER_AUTH_URL` rather than client input.
- Resend uses `RESEND_API_KEY` and `RESEND_EMAIL`. Never print secrets. Delivery failure leaves a pending account and offers manual retry. Resending is limited to once a minute, invalidates earlier tokens, and is unavailable after password creation.
- Passwords reuse the configured bcrypt hash with a 72-byte limit. Password reset revokes sessions. Preserve server validation even when adding client validation.
- Idle monitoring warns after 14 minutes and logs out after 15, sharing activity across tabs by session ID. An expired session must not be revived by reload or delayed activity. This browser idle mechanism is separate from the seven-day server session expiry.

## Verification

For role or session changes, run the relevant tests:

```sh
node --import tsx --test lib/drizzle/order-access.test.ts lib/betterAuth/idle-session.test.ts
```

`lib/user-management/service.test.ts` requires Node 22.15+ and an explicitly configured empty disposable database named `felix_user_management_*`; without `USER_MANAGEMENT_TEST_DATABASE_URL` it skips. Follow `docs/user-management.md`. It mocks email delivery; passing it does not verify live Resend delivery. Never point it at the configured application database.

Use the existing Better Auth skills for library configuration and match documentation to the installed version. Do not add live invitation emails or delete real users merely to test a code change.
