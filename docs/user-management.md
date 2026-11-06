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
