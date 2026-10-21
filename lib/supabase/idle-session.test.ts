import assert from "node:assert/strict";
import { test } from "node:test";
import { IdleSession, IdleSignOut, IDLE_WARNING_MS, IDLE_LOGOUT_MS, readIdleRecord, type IdleRecord, type IdleView } from "./idle-session";

function setup() {
  let now = 1000000;
  let shared: IdleRecord | null = null;
  const tabs: { idle: IdleSession; views: IdleView[]; expired: () => number }[] = [];
  function tab() {
    const views: IdleView[] = [];
    let expirations = 0;
    const idle = new IdleSession({ now: () => now, read: () => shared,
      write: record => { shared = structuredClone(record); },
      onChange: view => views.push(view), onExpire: () => { expirations++; } });
    const result = { idle, views, expired: () => expirations }; tabs.push(result); return result;
  }
  return { tab, advance: (ms: number) => { now += ms; }, shared: () => shared };
}

test("warns at 14 minutes, counts down, expires once at 15, and ignores late activity", () => {
  const clock = setup(); const tab = clock.tab();
  clock.advance(IDLE_WARNING_MS - 1); tab.idle.check(); assert.equal(tab.views.at(-1)?.status, "active");
  clock.advance(1); tab.idle.check(); assert.deepEqual(tab.views.at(-1), { status: "warning", remainingSeconds: 60 });
  clock.advance(1000); tab.idle.check(); assert.equal(tab.views.at(-1)?.remainingSeconds, 59);
  clock.advance(59000); tab.idle.activity(); tab.idle.check(); tab.idle.activity();
  assert.equal(tab.views.at(-1)?.status, "expired"); assert.equal(tab.expired(), 1);
});

test("activity in one tab resets warning and deadline in other tabs", () => {
  const clock = setup(); const first = clock.tab(); const second = clock.tab();
  clock.advance(IDLE_WARNING_MS); first.idle.check(); second.idle.check();
  first.idle.activity(); second.idle.receive(clock.shared());
  assert.equal(first.views.at(-1)?.status, "active"); assert.equal(second.views.at(-1)?.status, "active");
  clock.advance(IDLE_LOGOUT_MS - 1); first.idle.check(); assert.equal(first.expired(), 0);
  clock.advance(1); second.idle.check(); first.idle.receive(clock.shared());
  assert.equal(first.expired(), 1); assert.equal(second.expired(), 1);
});

test("reload/new tabs preserve the existing deadline; a fresh session starts its own timer", () => {
  const clock = setup(); clock.tab(); clock.advance(IDLE_WARNING_MS);
  const reload = clock.tab(); assert.equal(reload.views.at(-1)?.status, "warning");
  clock.advance(60000); const expiredReload = clock.tab(); assert.equal(expiredReload.expired(), 1);
  const freshSession = setup().tab(); assert.equal(freshSession.views.at(-1)?.status, "active");
});

test("sleeping past the deadline expires before accepting wake-up activity", () => {
  const clock = setup(); const tab = clock.tab(); clock.advance(IDLE_LOGOUT_MS + 100000);
  tab.idle.activity(); assert.equal(tab.expired(), 1); assert.equal(clock.shared()?.expired, true);
});

test("checks and token-refresh-like polling do not reset inactivity; warning activity does", () => {
  const clock = setup(); const tab = clock.tab();
  for (let i = 0; i < 14; i++) { clock.advance(60000); tab.idle.check(); }
  assert.equal(tab.views.at(-1)?.status, "warning");
  tab.idle.activity(); assert.equal(tab.views.at(-1)?.status, "active");
  clock.advance(60000); tab.idle.check(); assert.equal(tab.expired(), 0);
});

test("rejects malformed/future timestamps and falls back to local tracking when storage is unavailable", () => {
  for (const record of [null, {}, {lastActivity: Infinity, expired:false}, {lastActivity:200,expired:false}, {lastActivity:1,expired:"false"}]) {
    assert.equal(readIdleRecord(record,100), null);
  }
  let now = 100; let expired = false;
  const idle = new IdleSession({now:()=>now,read:()=>null,write:()=>{},onChange:()=>{},onExpire:()=>{expired=true;}});
  now += IDLE_LOGOUT_MS; idle.check(); assert.equal(expired,true);
});

test("logout retries failures, avoids duplicate requests, and redirects only after success", async () => {
  const retries: (()=>void)[] = []; const errors: boolean[]=[]; let calls=0; let redirects=0;
  let resolve!: (value:{error:unknown})=>void;
  const logout = new IdleSignOut({signOut:()=>{calls++;return new Promise(r=>{resolve=r;});},onSuccess:()=>{redirects++;},onError:e=>errors.push(e),schedule:(retry,delay)=>{assert.equal(delay,5000);retries.push(retry);return()=>{};}});
  const first = logout.run(); await logout.run(); assert.equal(calls,1);
  resolve({error:new Error("offline")}); await first; assert.equal(redirects,0); assert.equal(errors.at(-1),true);
  retries[0](); assert.equal(calls,2); resolve({error:null}); await Promise.resolve(); await Promise.resolve();
  assert.equal(redirects,1); await logout.run(); assert.equal(calls,2);
});

test("unmount cancels retry and prevents a late successful response from navigating", async () => {
  let resolve!: (value:{error:unknown})=>void; let redirects=0;
  const logout = new IdleSignOut({signOut:()=>new Promise(r=>{resolve=r;}),onSuccess:()=>{redirects++;},onError:()=>{},schedule:()=>()=>{}});
  const pending=logout.run(); logout.dispose(); resolve({error:null}); await pending; assert.equal(redirects,0);
});

test("scheduled logout retries are cancelled on unmount", async () => {
  let cancelled = false;
  const logout = new IdleSignOut({signOut:async()=>({error:new Error("offline")}),onSuccess:()=>{},onError:()=>{},schedule:()=>()=>{cancelled=true;}});
  await logout.run(); logout.dispose(); assert.equal(cancelled,true);
});
