import assert from "node:assert/strict";
import { test } from "node:test";
import * as nodeModule from "node:module";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { authOptions } from "./auth-options";

// Match Next's server-only marker without connecting to the application database.
const { registerHooks } = nodeModule as typeof nodeModule & {
  registerHooks: (hooks: {
    resolve: (specifier: string, context: object, next: (specifier: string, context: object) => { url: string }) => { url: string };
  }) => unknown;
};
registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === "server-only" ? "next/dist/compiled/server-only/empty.js" : specifier, context);
  },
});

test("reset emails support existing and pending accounts, single use, expiry, and session revocation", async () => {
  process.env.RESEND_API_KEY = "test-only-no-real-emails";
  process.env.RESEND_EMAIL = "test@example.com";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  const { sendPasswordResetEmail } = await import("../user-management/email");
  const now = new Date();
  const database: MemoryDB = {
    user: [
      { id: "existing", name: "Existing", email: "existing@example.com", emailVerified: true, createdAt: now, updatedAt: now },
      { id: "pending", name: "Pending", email: "pending@example.com", emailVerified: false, createdAt: now, updatedAt: now },
    ],
    account: [{ id: "credential", accountId: "existing", providerId: "credential", userId: "existing", password: await authOptions.emailAndPassword.password.hash("old-password"), createdAt: now, updatedAt: now }],
    session: [], verification: [], rateLimit: [],
  };
  const auth = betterAuth({
    ...authOptions,
    baseURL: "http://localhost:3000",
    secret: "test-only-isolated-secret-at-least-32-characters",
    database: memoryAdapter(database),
    logger: { disabled: true },
    emailAndPassword: { ...authOptions.emailAndPassword, sendResetPassword: sendPasswordResetEmail },
  });
  const messages: { to: string[]; text: string; subject: string }[] = [];
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails");
      messages.push(JSON.parse(String(options?.body)));
      return new Response("{}", { status: 200 });
    };
    const unknown = await auth.api.requestPasswordReset({ body: { email: "unknown@example.com" } });
    assert.equal(messages.length, 0);
    await auth.api.signInEmail({ body: { email: "existing@example.com", password: "old-password" } });
    assert.equal(database.session.length, 1);
    const existing = await auth.api.requestPasswordReset({ body: { email: "existing@example.com", redirectTo: "http://localhost:3000/unwanted" } });
    assert.deepEqual(existing, unknown);
    assert.deepEqual(messages[0].to, ["existing@example.com"]);
    const link = new URL(messages[0].text.match(/http:\/\/[^\s]+/)![0]);
    assert.equal(link.origin, "http://localhost:3000");
    assert.equal(link.pathname, "/set-password");
    const token = link.searchParams.get("token")!;
    assert.ok(token);
    const verification = database.verification.find((row) => row.identifier === `reset-password:${token}`)!;
    assert.ok(Math.abs(new Date(verification.expiresAt).getTime() - now.getTime() - 3_600_000) < 30_000);
    await auth.api.resetPassword({ body: { token, newPassword: "replacement-password" } });
    assert.equal(database.session.length, 0);
    await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: "reused-password" } }));
    await assert.rejects(auth.api.signInEmail({ body: { email: "existing@example.com", password: "old-password" } }));
    await auth.api.signInEmail({ body: { email: "existing@example.com", password: "replacement-password" } });

    await auth.api.requestPasswordReset({ body: { email: "pending@example.com" } });
    assert.deepEqual(messages[1].to, ["pending@example.com"]);
    const pendingToken = new URL(messages[1].text.match(/http:\/\/[^\s]+/)![0]).searchParams.get("token")!;
    await auth.api.resetPassword({ body: { token: pendingToken, newPassword: "first-password" } });
    await auth.api.signInEmail({ body: { email: "pending@example.com", password: "first-password" } });

    await auth.api.requestPasswordReset({ body: { email: "existing@example.com" } });
    const expiredToken = new URL(messages[2].text.match(/http:\/\/[^\s]+/)![0]).searchParams.get("token")!;
    database.verification.find((row) => row.identifier === `reset-password:${expiredToken}`)!.expiresAt = new Date(0);
    await assert.rejects(auth.api.resetPassword({ body: { token: expiredToken, newPassword: "expired-password" } }));
    globalThis.fetch = async () => new Response("provider details must stay private", { status: 503 });
    await assert.rejects(sendPasswordResetEmail({ user: { email: "existing@example.com" }, token: "test-token" }), /^Error: Email delivery failed\.$/);

    for (let i = 0; i < 4; i++) {
      const response = await auth.handler(new Request("http://localhost:3000/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "192.0.2.10" },
        body: JSON.stringify({ email: "unknown@example.com" }),
      }));
      assert.equal(response.status, i < 3 ? 200 : 429);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
