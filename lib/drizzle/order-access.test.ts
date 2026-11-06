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
    form.set("projectName", "Test project");
    form.set("clientName", "Test customer");
    form.set("gbpToUsdRate", "1.40");
    form.set("eurToUsdRate", "1.20");
    form.set("usdToSgdRate", "1.30");
    form.set("orderManagerAccess", access);
    const parsed = readOrderValues(form, "Order manager");
    assert.ok(parsed.ok);
    assert.equal(Object.hasOwn(parsed.values, "orderManagerAccess"), false);
  }
});

// Attribution is supplied by the server, even when the browser submits a name.
test("the form cannot impersonate another creator", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test customer");
  form.set("gbpToUsdRate", "1.40");
  form.set("eurToUsdRate", "1.20");
  form.set("usdToSgdRate", "1.30");
  form.set("createdBy", "Forged name");
  const result = readOrderValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.createdBy, "Current user");
  assert.equal(readOrderValues(form, "").ok, false);
});

test("only project and customer names are mandatory user-entered fields", () => {
  const form = new FormData();
  assert.equal(readOrderValues(form, "Current user").ok, false);
  form.set("projectName", "   ");
  form.set("clientName", "Customer");
  assert.equal(readOrderValues(form, "Current user").ok, false);
  form.set("projectName", "Project");
  form.set("clientName", "  ");
  assert.equal(readOrderValues(form, "Current user").ok, false);
  form.set("clientName", "Customer");
  const result = readOrderValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.projectName, "Project");
  assert.equal(result.values.clientName, "Customer");
  assert.equal(result.values.referenceNumber, null);
  form.set("referenceNumber", "  REF / 001-A  ");
  const referenced = readOrderValues(form, "Current user");
  assert.ok(referenced.ok);
  assert.equal(referenced.values.referenceNumber, "REF / 001-A");
  assert.ok(result.values.gbpToUsdRate);
  form.set("gbpToUsdRate", "0");
  assert.equal(readOrderValues(form, "Current user").ok, false);
});
