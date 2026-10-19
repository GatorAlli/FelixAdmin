import assert from "node:assert/strict";
import { test } from "node:test";
import { canEditOrder } from "./order-access";
import { readOrderValues } from "./order-values";

test("revoking order-manager access keeps admins able to edit", () => {
  assert.equal(canEditOrder("admin", true), true);
  assert.equal(canEditOrder("admin", false), true);
  assert.equal(canEditOrder("order", true), true);
  assert.equal(canEditOrder("order", false), false);
});

test("guests and unknown profiles cannot edit, regardless of the access flag", () => {
  for (const status of ["guest", "", "ADMIN", "unknown", null, undefined]) {
    assert.equal(canEditOrder(status, true), false);
    assert.equal(canEditOrder(status, false), false);
  }
});

test("a forged order form cannot grant or revoke manager access", () => {
  for (const access of ["true", "false"]) {
    const form = new FormData();
    form.set("gbpToUsdRate", "1.40");
    form.set("eurToUsdRate", "1.20");
    form.set("usdToSgdRate", "1.30");
    form.set("orderManagerAccess", access);
    const parsed = readOrderValues(form, "Order manager");
    assert.ok(parsed.ok);
    assert.equal(Object.hasOwn(parsed.values, "orderManagerAccess"), false);
  }
});
