import assert from "node:assert/strict";
import { test } from "node:test";
import { currentOrderDate, formatOrderDate } from "./order-date";
import { readOrderValues } from "./order-values";

test("creation dates use Bangladesh time across midnight and year boundaries", () => {
  assert.equal(currentOrderDate(new Date("2026-10-13T17:59:59Z")), "2026-10-13");
  assert.equal(currentOrderDate(new Date("2026-10-13T18:00:00Z")), "2026-10-14");
  assert.equal(currentOrderDate(new Date("2026-12-31T18:00:00Z")), "2027-01-01");
});

test("display uses DD/MM/YY and does not invent dates for older orders", () => {
  assert.equal(formatOrderDate("2026-10-14"), "14/10/26");
  assert.equal(formatOrderDate("2027-01-02"), "02/01/27");
  assert.equal(formatOrderDate(null), "Not recorded");
});

test("submitted creation dates cannot overwrite the stored creation date", () => {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.3");
  form.set("eurToUsdRate", "1.1");
  form.set("usdToSgdRate", "1.30");
  form.set("createdDate", "1999-01-01");
  const result = readOrderValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(Object.hasOwn(result.values, "createdDate"), false);
});
