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
  registerHooks: (hooks: { resolve: (specifier: string, context: object, next: Resolve) => { url: string } }) => unknown;
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return nextResolve("next/dist/compiled/server-only/empty.js", context);
  return nextResolve(specifier, context);
} });

const testURL = process.env.USER_MANAGEMENT_TEST_DATABASE_URL;

test("admin invitations, password creation, and removal preserve access boundaries", { skip: !testURL }, async () => {
  // This suite installs tables only into an explicitly named disposable database.
  assert.ok(testURL);
  assert.match(new URL(testURL).pathname, /^\/felix_user_management_[a-z_]+$/);
  process.env.DATABASE_URL = testURL;
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "isolated-test-secret-with-at-least-32-characters";
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
      const email = { email: "recipient@example.com", url: "https://example.com/invitation", deliveryId: randomUUID() };
      await sendInvitationEmail(email);
      globalThis.fetch = async () => new Response("provider error", { status: 503 });
      await assert.rejects(sendInvitationEmail(email), /delivery failed/);
    } finally { globalThis.fetch = originalFetch; }
    const adminId = randomUUID();
    const guestId = randomUUID();
    await client`insert into better_auth.user (id, name, email) values (${adminId}, 'Admin', 'admin@example.com'), (${guestId}, 'Guest', 'guest@example.com')`;
    await client`insert into users (name, email, status) values ('Admin', 'admin@example.com', 'admin'), ('Guest', 'guest@example.com', 'guest')`;
    const input = { name: "New Manager", email: " MANAGER@example.com ", access: "order" };
    await assert.rejects(changeManagedUser(guestId, { kind: "invite", input }), /Only admins/);
    await assert.rejects(listManagedUsers(guestId), /Only admins/);
    await assert.rejects(changeManagedUser(adminId, { kind: "remove", id: adminId }), /own account/);
    await assert.rejects(changeManagedUser(adminId, { kind: "invite", input: { ...input, access: "superadmin" } }), /Choose Admin/);
    const invitation = await changeManagedUser(adminId, { kind: "invite", input });
    assert.ok(invitation);
    assert.equal(invitation.email, "manager@example.com");
    let manager = (await listManagedUsers(adminId)).find((user) => user.email === invitation.email)!;
    assert.ok(manager.pending);
    assert.equal(manager.access, "order");
    assert.equal(Object.hasOwn(manager, "password"), false);
    await assert.rejects(auth.api.signInEmail({ body: { email: invitation.email, password: "not-a-password" } }));
    await assert.rejects(changeManagedUser(adminId, { kind: "invite", input }), /already exists/);
    await assert.rejects(changeManagedUser(adminId, { kind: "resend", id: manager.id }), /one minute/);
    await client`update better_auth.verification set created_at = now() - interval '2 minutes' where value = ${manager.id}`;
    const replacement = await changeManagedUser(adminId, { kind: "resend", id: manager.id });
    assert.ok(replacement);
    const token = (url: string) => new URL(url).pathname.split("/").pop()!;
    const callback = await auth.handler(new Request(replacement.url));
    assert.equal(callback.status, 302);
    const destination = new URL(callback.headers.get("location")!);
    assert.equal(destination.pathname, "/set-password");
    assert.equal(destination.searchParams.get("token"), token(replacement.url));
    await assert.rejects(auth.api.resetPassword({ body: { token: token(invitation.url), newPassword: "Test password 123" } }));
    await auth.api.resetPassword({ body: { token: token(replacement.url), newPassword: "Test password 123" } });
    await assert.rejects(auth.api.resetPassword({ body: { token: token(replacement.url), newPassword: "Different password 123" } }));
    manager = (await listManagedUsers(adminId)).find((user) => user.id === manager.id)!;
    assert.equal(manager.pending, false);
    await assert.rejects(changeManagedUser(adminId, { kind: "resend", id: manager.id }), /already created/);
    const signedIn = await auth.api.signInEmail({ body: { email: invitation.email, password: "Test password 123" } });
    assert.ok(signedIn.token);
    await client`insert into data ("createdBy", "felixOrderRef") values ('New Manager', 'KEEP-001')`;
    await assert.rejects(changeManagedUser(guestId, { kind: "remove", id: manager.id }), /Only admins/);
    await changeManagedUser(adminId, { kind: "remove", id: manager.id });
    assert.equal((await client`select * from better_auth.session where user_id = ${manager.id}`).length, 0);
    assert.equal((await client`select * from better_auth.account where user_id = ${manager.id}`).length, 0);
    assert.equal((await client`select * from users where email = ${invitation.email}`).length, 0);
    assert.equal((await client`select * from data where "felixOrderRef" = 'KEEP-001'`).length, 1);
    await assert.rejects(auth.api.signInEmail({ body: { email: invitation.email, password: "Test password 123" } }));

    const expired = await changeManagedUser(adminId, { kind: "invite", input: { name: "Expired", email: "expired@example.com", access: "guest" } });
    assert.ok(expired);
    await client`update better_auth.verification set expires_at = now() - interval '1 minute' where identifier = ${`reset-password:${token(expired.url)}`}`;
    await assert.rejects(auth.api.resetPassword({ body: { token: token(expired.url), newPassword: "Test password 123" } }));
    const pending = (await listManagedUsers(adminId)).find((user) => user.email === expired.email)!;
    await changeManagedUser(adminId, { kind: "remove", id: pending.id });
    assert.equal((await client`select * from better_auth.verification where value = ${pending.id}`).length, 0);
    await assert.rejects(changeManagedUser(pending.id, { kind: "invite", input }), /Only admins/);

    const simultaneous = await Promise.allSettled([
      changeManagedUser(adminId, { kind: "invite", input: { ...input, email: "race@example.com" } }),
      changeManagedUser(adminId, { kind: "invite", input: { ...input, email: "race@example.com" } }),
    ]);
    assert.equal(simultaneous.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal((await client`select * from users where email = 'race@example.com'`).length, 1);
  } finally {
    await client.end();
    await db.$client.end();
  }
});
