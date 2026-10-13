import assert from "node:assert/strict";
import { test } from "node:test";
import {
  convertToUsd, isValidRate, restoreSupplierRows,
  DEFAULT_GBP_TO_USD, DEFAULT_EUR_TO_USD,
} from "./currency";
import { readOrderValues } from "./order-values";

function form(rows: [string, string, string][] = [["HONEYWELL", "100", "GBP"]]) {
  const data = new FormData();
  data.set("createdBy", "Currency test");
  data.set("gbpToUsdRate", DEFAULT_GBP_TO_USD);
  data.set("eurToUsdRate", DEFAULT_EUR_TO_USD);
  for (const [supplier, amount, currency] of rows) {
    data.append("supplier", supplier);
    data.append("supplierAmount", amount);
    data.append("supplierCurrency", currency);
  }
  return data;
}

test("USD is unchanged; GBP/EUR use their independent per-order rates", () => {
  assert.equal(convertToUsd("100", "USD", "", ""), "100.00");
  assert.equal(convertToUsd("100", "GBP", DEFAULT_GBP_TO_USD, DEFAULT_EUR_TO_USD), "132.35");
  assert.equal(convertToUsd("100", "EUR", DEFAULT_GBP_TO_USD, DEFAULT_EUR_TO_USD), "111.81");
  assert.equal(convertToUsd("100", "GBP", "1.5", "1.2"), "150.00");
  assert.equal(convertToUsd("100", "EUR", "1.5", "1.2"), "120.00");
});

test("decimal multiplication rounds half cents up and preserves large amounts", () => {
  assert.equal(convertToUsd("1.00", "EUR", "1", "1.005"), "1.01");
  assert.equal(convertToUsd("0.01", "GBP", "0.5", "1"), "0.01");
  assert.equal(convertToUsd("9999999999999999.99", "USD", "1", "1"), "9999999999999999.99");
  assert.equal(convertToUsd("9999999999999999.99", "EUR", "1", "2"), null);
  assert.equal(convertToUsd("0", "GBP", "1.5", "1"), "0.00");
});

test("invalid, incomplete and excessive-precision amounts/rates are rejected", () => {
  for (const rate of ["", "0", "-1", "NaN", "Infinity", "1e3", "1.123456789", "10000000000"]) {
    assert.equal(isValidRate(rate), false, rate);
  }
  assert.equal(isValidRate("0.00000001"), true);
  for (const amount of ["", "-1", "NaN", "1e3", "1.001"]) {
    assert.equal(convertToUsd(amount, "USD", "1", "1"), null, amount);
  }
});

test("saving recomputes USD and retains original details for reopening", () => {
  const input = form([["HONEYWELL", "100", "GBP"], ["TRANE", "200", "EUR"], ["BELIMO", "50", "USD"]]);
  input.set("supplierUsd", "999999"); // Forged display totals must be ignored.
  const result = readOrderValues(input, "Currency test");
  assert.ok(result.ok);
  assert.equal(result.values.honeywell, "132.35");
  assert.equal(result.values.trane, "223.62");
  assert.equal(result.values.belimo, "50.00");
  assert.equal(result.values.gbpToUsdRate, DEFAULT_GBP_TO_USD);
  assert.equal(result.values.eurToUsdRate, DEFAULT_EUR_TO_USD);
  const restored = restoreSupplierRows({
    ...result.values,
    supplierCurrencyDetails: result.values.supplierCurrencyDetails ?? null,
  });
  assert.deepEqual(restored.map(({supplier, amount, currency}) => ({supplier, amount, currency})), [
    { supplier: "TRANE", amount: "200", currency: "EUR" },
    { supplier: "BELIMO", amount: "50", currency: "USD" },
    { supplier: "HONEYWELL", amount: "100", currency: "GBP" },
  ]);
});

test("rates are required even for USD-only orders", () => {
  for (const field of ["gbpToUsdRate", "eurToUsdRate"]) {
    const input = form([["TRANE", "1", "USD"]]);
    input.delete(field);
    assert.equal(readOrderValues(input, "Currency test").ok, false);
  }
});

test("unknown currencies, duplicate suppliers and incomplete rows fail validation", () => {
  for (const rows of [
    [["TRANE", "1", "AUD"]],
    [["TRANE", "1", "USD"], ["TRANE", "1", "EUR"]],
    [["TRANE", "", "USD"]],
    [["__proto__", "1", "USD"]],
  ] as [string, string, string][][]) {
    assert.equal(readOrderValues(form(rows), "Currency test").ok, false);
  }
  const missingCurrency = form();
  missingCurrency.delete("supplierCurrency");
  assert.equal(readOrderValues(missingCurrency, "Currency test").ok, false);
});

test("removed suppliers are cleared; a blank optional row is skipped", () => {
  const result = readOrderValues(form([["", "", "USD"]]), "Currency test");
  assert.ok(result.ok);
  assert.equal(result.values.honeywell, null);
  assert.equal(result.values.suppliers, null);
  assert.deepEqual(result.values.supplierCurrencyDetails, []);
});

test("legacy orders reopen as USD, including zero-value suppliers", () => {
  assert.deepEqual(restoreSupplierRows({supplierCurrencyDetails: null, trane: "1234.00", belimo: "0.00"}), [
    {id: 1, supplier: "TRANE", amount: "1234.00", currency: "USD"},
    {id: 2, supplier: "BELIMO", amount: "0.00", currency: "USD"},
  ]);
});


test("Created By comes only from the authenticated username", () => {
  const input = form();
  input.set("createdBy", "Forged name");
  const result = readOrderValues(input, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.createdBy, "Current user");
  input.delete("createdBy");
  const withoutField = readOrderValues(input, "Another user");
  assert.ok(withoutField.ok);
  assert.equal(withoutField.values.createdBy, "Another user");
  assert.equal(readOrderValues(input, "").ok, false);
});
