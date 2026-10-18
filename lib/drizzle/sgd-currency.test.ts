import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToUsd, convertFromUsd, DEFAULT_GBP_TO_USD, DEFAULT_EUR_TO_USD, DEFAULT_USD_TO_SGD, restoreSupplierRows } from "./currency";
import { readOrderValues } from "./order-values";
import { expenseUsdByName } from "./expenses";
import { calculateOrderTotals } from "./order-calculations";

function form() {
  const f = new FormData();
  f.set("gbpToUsdRate", DEFAULT_GBP_TO_USD);
  f.set("eurToUsdRate", DEFAULT_EUR_TO_USD);
  f.set("usdToSgdRate", DEFAULT_USD_TO_SGD);
  f.set("clientOrderValue", "1300");
  f.set("clientOrderCurrency", "SGD");
  f.set("supplier", "HONEYWELL");
  f.set("supplierAmount", "130");
  f.set("supplierCurrency", "SGD");
  f.set("expenseName", "shipping");
  f.set("expenseAmount", "13");
  f.set("expenseCurrency", "SGD");
  f.set("panelCurrency-commission", "SGD");
  return f;
}

test("SGD divides to USD, multiplies from USD, and rounds exact cents including losses", () => {
  assert.equal(convertToUsd("130", "SGD", "1.40", "1.20", "1.30"), "100.00");
  assert.equal(convertFromUsd("100", "SGD", "1.40", "1.20", "1.30"), "130.00");
  assert.equal(convertFromUsd("-100", "SGD", "1.40", "1.20", "1.30"), "-130.00");
  assert.equal(convertToUsd("1", "SGD", "1", "1", "1.30"), "0.77");
  assert.equal(convertToUsd("0.01", "SGD", "1", "1", "2"), "0.01");
  assert.equal(convertToUsd("10", "SGD", "1", "1", "0"), null);
  assert.equal(convertFromUsd("9999999999999999.99", "SGD", "1", "1", "1.30"), null);
});

test("SGD saves original amounts, USD totals, rate and panel choices, and restores details", () => {
  const result = readOrderValues(form(), "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.clientOrderValue, "1000.00");
  assert.equal(result.values.clientOrderOriginalValue, "1300");
  assert.equal(result.values.clientOrderCurrency, "SGD");
  assert.equal(result.values.honeywell, "100.00");
  assert.equal(result.values.misCost, "10.00");
  assert.equal(result.values.usdToSgdRate, "1.30");
  assert.equal(result.values.calculationCurrencies?.commission, "SGD");
  const saved = { ...result.values, supplierCurrencyDetails: result.values.supplierCurrencyDetails ?? null };
  assert.equal(restoreSupplierRows(saved)[0].currency, "SGD");
  assert.equal(restoreSupplierRows(saved)[0].amount, "130");
  assert.equal(expenseUsdByName({ ...result.values, miscellaneousExpenses: result.values.miscellaneousExpenses ?? null, misCost: result.values.misCost ?? null }).get("SHIPPING"), "10.00");
});

test("all rates require positive values with no more than two decimal places", () => {
  for (const name of ["gbpToUsdRate", "eurToUsdRate", "usdToSgdRate"]) {
    for (const rate of ["", "0", "-1", "1.301"]) {
      const f = form(); f.set(name, rate);
      assert.equal(readOrderValues(f, "Test").ok, false);
    }
  }
});

test("SGD live totals use the rate for project, supplier and miscellaneous amounts", () => {
  const input = { projectValue: "1300", projectCurrency: "SGD" as const, suppliers: [{amount: "130", currency: "SGD" as const}], expenses: [{amount:"13", currency:"SGD" as const}], gbpToUsdRate:"1.40", eurToUsdRate:"1.20", usdToSgdRate:"1.30", orderHandlingFee:"5", miscellaneousHandlingFee:"2" };
  assert.equal(calculateOrderTotals(input).commission, "884.80");
  assert.equal(calculateOrderTotals({...input, usdToSgdRate:"2.60"}).projectValue, "500.00");
});
