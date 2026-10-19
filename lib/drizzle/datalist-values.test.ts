import assert from "node:assert/strict";
import { test } from "node:test";
import { readDatalistValues } from "./datalist-values";
import { readOrderValues } from "./order-values";

test("supplier suggestions normalize names and allow new brands", () => {
  assert.deepEqual(readDatalistValues("suppliers", [" trane ", "Control 4"]), {
    ok: true, values: ["TRANE", "CONTROL 4"],
  });
  assert.deepEqual(readDatalistValues("suppliers", ["Custom Brand"]), {
    ok: true, values: ["CUSTOM BRAND"],
  });
});

test("expense suggestions are editable labels and may be cleared entirely", () => {
  assert.deepEqual(readDatalistValues("expenses", [" Bank Fee ", "Insurance"]), {
    ok: true, values: ["Bank Fee", "Insurance"],
  });
  assert.deepEqual(readDatalistValues("expenses", []), { ok: true, values: [] });
});

test("customer suggestions preserve names and reject case-insensitive duplicates", () => {
  assert.deepEqual(readDatalistValues("customers", [" Square Pharmaceuticals ", "ACME Ltd"]), {
    ok: true, values: ["Square Pharmaceuticals", "ACME Ltd"],
  });
  assert.equal(readDatalistValues("customers", ["ACME Ltd", "acme ltd"]).ok, false);
  assert.deepEqual(readDatalistValues("customers", []), { ok: true, values: [] });
});

test("changing customer suggestions does not restrict saved or manually typed customer names", () => {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.40");
  form.set("eurToUsdRate", "1.20");
  form.set("usdToSgdRate", "1.30");
  form.set("clientName", "Historical customer");
  const parsed = readOrderValues(form, "Order manager");
  assert.ok(parsed.ok);
  assert.equal(parsed.values.clientName, "Historical customer");
});

test("duplicate, blank, oversized and malformed suggestions are rejected", () => {
  for (const input of [["Bank Fee", "bank fee"], [" "], ["x".repeat(201)], [123], null]) {
    assert.equal(readDatalistValues("expenses", input).ok, false);
  }
});

test("removing a suggestion does not invalidate existing order expense values", () => {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.40");
  form.set("eurToUsdRate", "1.20");
  form.set("usdToSgdRate", "1.30");
  form.append("expenseName", "Previously saved expense");
  form.append("expenseAmount", "10");
  form.append("expenseCurrency", "USD");
  const parsed = readOrderValues(form, "Order manager");
  assert.ok(parsed.ok);
  assert.equal(parsed.values.miscellaneousExpenses?.[0].name, "PREVIOUSLY SAVED EXPENSE");
});
