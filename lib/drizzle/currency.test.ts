import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToUsd, convertFromUsd, restoreSupplierRows } from "./currency";
import { readOrderValues } from "./order-values";
import { sumMoneyAmounts } from "../format-money";

// Money stays in decimal strings so large amounts do not lose cents.
test("USD, GBP, EUR and SGD convert using the order's rates", () => {
  assert.equal(convertToUsd("100", "USD", "1.4", "1.2", "1.3"), "100.00");
  assert.equal(convertToUsd("100", "GBP", "1.4", "1.2", "1.3"), "140.00");
  assert.equal(convertToUsd("100", "EUR", "1.4", "1.2", "1.3"), "120.00");
  assert.equal(convertToUsd("130", "SGD", "1.4", "1.2", "1.3"), "100.00");
  assert.equal(convertFromUsd("100", "SGD", "1.4", "1.2", "1.3"), "130.00");
  assert.equal(convertFromUsd("-140", "GBP", "1.4", "1.2"), "-100.00");
});

test("conversion rounds half cents and rejects invalid amounts or overflow", () => {
  assert.equal(convertToUsd("0.01", "GBP", "0.5", "1"), "0.01");
  assert.equal(convertToUsd("1", "SGD", "1", "1", "1.3"), "0.77");
  assert.equal(convertToUsd("9999999999999999.99", "USD", "1", "1"), "9999999999999999.99");
  assert.equal(convertToUsd("9999999999999999.99", "EUR", "1", "2"), null);
  assert.equal(convertToUsd("-1", "USD", "1", "1"), null);
  assert.equal(convertToUsd("10", "SGD", "1", "1", "0"), null);
});

test("supplier totals add exact cents and ignore empty amounts", () => {
  assert.equal(sumMoneyAmounts(["0.10", "0.20", null, undefined, ""]), "0.30");
  assert.equal(sumMoneyAmounts(["9999999999999999.99", "0.02"]), "10000000000000000.01");
  assert.equal(sumMoneyAmounts(["1.00", "-2.25"]), "-1.25");
  assert.equal(sumMoneyAmounts([]), "0.00");
});

test("saving an SGD supplier keeps the original amount and recalculates USD", () => {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.40");
  form.set("eurToUsdRate", "1.20");
  form.set("usdToSgdRate", "1.30");
  form.set("supplier", "HONEYWELL");
  form.set("supplierAmount", "130");
  form.set("supplierCurrency", "SGD");
  form.set("supplierUsd", "999999");

  const result = readOrderValues(form, "Test user");
  assert.ok(result.ok);
  assert.equal(result.values.honeywell, "100.00");
  const restored = restoreSupplierRows({
    ...result.values,
    supplierCurrencyDetails: result.values.supplierCurrencyDetails ?? null,
  });
  assert.equal(restored[0].amount, "130");
  assert.equal(restored[0].currency, "SGD");
});
