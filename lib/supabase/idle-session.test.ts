import assert from "node:assert/strict";
import { test } from "node:test";
import { IdleSession, IdleSignOut, IDLE_WARNING_MS, IDLE_LOGOUT_MS, type IdleRecord, type IdleView } from "./idle-session";

// A manual clock tests minutes of inactivity without waiting in real time.
function setup() {
  let now = 1_000_000;
  let shared: IdleRecord | null = null;

  function tab() {
    const views: IdleView[] = [];
    let expirations = 0;
    const idle = new IdleSession({
      now: () => now,
      read: () => shared,
      write: (record) => { shared = structuredClone(record); },
      onChange: (view) => views.push(view),
      onExpire: () => { expirations++; },
    });
    return { idle, views, expired: () => expirations };
  }

  return {
    tab,
    advance: (milliseconds: number) => { now += milliseconds; },
    shared: () => shared,
  };
}

test("warns at 14 minutes and expires once at 15 minutes", () => {
  const clock = setup();
  const tab = clock.tab();
  clock.advance(IDLE_WARNING_MS);
  tab.idle.check();
  assert.deepEqual(tab.views.at(-1), { status: "warning", remainingSeconds: 60 });

  clock.advance(60_000);
  tab.idle.activity();
  tab.idle.check();
  assert.equal(tab.views.at(-1)?.status, "expired");
  assert.equal(tab.expired(), 1);
});

test("activity in one tab resets the other tab's deadline", () => {
  const clock = setup();
  const first = clock.tab();
  const second = clock.tab();
  clock.advance(IDLE_WARNING_MS);
  first.idle.check();
  second.idle.check();
  first.idle.activity();
  second.idle.receive(clock.shared());
  assert.equal(first.views.at(-1)?.status, "active");
  assert.equal(second.views.at(-1)?.status, "active");

  clock.advance(IDLE_LOGOUT_MS);
  second.idle.check();
  first.idle.receive(clock.shared());
  assert.equal(first.expired(), 1);
  assert.equal(second.expired(), 1);
});

test("reloading or waking a sleeping tab does not reset an expired session", () => {
  const clock = setup();
  const sleepingTab = clock.tab();
  clock.advance(IDLE_LOGOUT_MS + 1);
  sleepingTab.idle.activity();
  assert.equal(sleepingTab.expired(), 1);
  assert.equal(clock.tab().expired(), 1);
});

test("failed logout retries without duplicate requests or an early redirect", async () => {
  const retries: (() => void)[] = [];
  let calls = 0;
  let redirects = 0;
  let resolveSignOut!: (value: { error: unknown }) => void;
  const logout = new IdleSignOut({
    signOut: () => {
      calls++;
      return new Promise((resolve) => { resolveSignOut = resolve; });
    },
    onSuccess: () => { redirects++; },
    onError: () => {},
    schedule: (retry) => {
      retries.push(retry);
      return () => {};
    },
  });

  const firstAttempt = logout.run();
  await logout.run();
  assert.equal(calls, 1);
  resolveSignOut({ error: new Error("offline") });
  await firstAttempt;
  assert.equal(redirects, 0);

  retries[0]();
  assert.equal(calls, 2);
  resolveSignOut({ error: null });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(redirects, 1);
  await logout.run();
  assert.equal(calls, 2);
});

test("leaving the page prevents a pending logout from redirecting later", async () => {
  let resolveSignOut!: (value: { error: unknown }) => void;
  let redirects = 0;
  const logout = new IdleSignOut({
    signOut: () => new Promise((resolve) => { resolveSignOut = resolve; }),
    onSuccess: () => { redirects++; },
    onError: () => {},
    schedule: () => () => {},
  });
  const pendingLogout = logout.run();
  logout.dispose();
  resolveSignOut({ error: null });
  await pendingLogout;
  assert.equal(redirects, 0);
});
