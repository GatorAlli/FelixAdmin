import assert from "node:assert/strict";
import { test } from "node:test";
import { readOrderValues } from "./order-values";
import { restoreSupplierRows } from "./currency";
import { customSupplierColumns, customSupplierUsdByName } from "./custom-suppliers";

function form(names = ["NEW BRAND"]) {
  const input = new FormData();
  input.set("gbpToUsdRate", "1.40");
  input.set("eurToUsdRate", "1.20");
  input.set("usdToSgdRate", "1.30");
  for (const name of names) {
    input.append("supplier", name);
    input.append("supplierAmount", "100");
    input.append("supplierCurrency", "EUR");
  }
  return input;
}

test("registered suppliers save original amounts and reopen with matching Summary costs", () => {
  const input = form(["new brand", "TRANE"]);
  input.set("customSupplierDetails", '[{"name":"FORGED","amount":"9999"}]');
  const parsed = readOrderValues(input, "Admin", ["NEW BRAND", "TRANE"]);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.values.customSupplierDetails, [{ name: "NEW BRAND", amount: "100", currency: "EUR" }]);
  assert.equal(parsed.values.trane, "120.00");
  const order = { ...parsed.values, supplierCurrencyDetails: parsed.values.supplierCurrencyDetails ?? null };
  assert.deepEqual(restoreSupplierRows(order).map(row => row.supplier), ["TRANE", "NEW BRAND"]);
  assert.equal(customSupplierUsdByName(order).get("NEW BRAND"), "120.00");
});

test("unregistered suppliers and duplicate names are rejected", () => {
  assert.equal(readOrderValues(form(), "Admin").ok, false);
  assert.equal(readOrderValues(form(["NEW BRAND", "new brand"]), "Admin", ["NEW BRAND"]).ok, false);
  assert.equal(readOrderValues(form(["TRANE"]), "Admin", []).ok, false);
});

test("Summary includes unused suggestions and retains renamed or removed historical suppliers", () => {
  const historical = { customSupplierDetails: [{ name: "OLD BRAND", amount: "100", currency: "USD" as const }] };
  assert.deepEqual(customSupplierColumns([historical], ["NEW BRAND", "TRANE"]), ["NEW BRAND", "OLD BRAND"]);
  assert.deepEqual(customSupplierColumns([], ["NEW BRAND"]), ["NEW BRAND"]);
  assert.equal(customSupplierUsdByName(historical).get("OLD BRAND"), "100.00");
});

test("removing supplier rows clears custom costs on the next save", () => {
  const parsed = readOrderValues(form([]), "Admin", ["NEW BRAND"]);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.values.customSupplierDetails, []);
});
