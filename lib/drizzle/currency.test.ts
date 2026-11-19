import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToBdt, isCurrency, type ExchangeRates } from "./currency";
import { readProposalValues } from "./proposal-values";
import { sumMoneyAmounts } from "../format-money";

const rates: ExchangeRates = {
  gbpToUsdRate: "1.40",
  eurToUsdRate: "1.20",
  usdToSgdRate: "1.30",
  usdToBdtRate: "125.00",
};

// Money stays in decimal strings so large amounts do not lose cents.
test("every currency converts to BDT using the proposal's rates", () => {
  assert.equal(convertToBdt("100", "BDT", rates), "100.00");
  assert.equal(convertToBdt("100", "USD", rates), "12500.00");
  assert.equal(convertToBdt("100", "GBP", rates), "17500.00");
  assert.equal(convertToBdt("100", "EUR", rates), "15000.00");
  assert.equal(convertToBdt("130", "SGD", rates), "12500.00");
});

test("conversion rounds once and rejects invalid amounts, rates or overflow", () => {
  // 1 SGD = 125 / 1.3 = 96.153846… BDT
  assert.equal(convertToBdt("1", "SGD", rates), "96.15");
  // 0.01 GBP = 0.01 × 1.4 × 125 = 1.75 BDT, with no intermediate USD rounding.
  assert.equal(convertToBdt("0.01", "GBP", rates), "1.75");
  assert.equal(
    convertToBdt("9999999999999999.99", "BDT", rates),
    "9999999999999999.99",
  );
  assert.equal(convertToBdt("9999999999999999.99", "USD", rates), null);
  assert.equal(convertToBdt("-1", "USD", rates), null);
  assert.equal(convertToBdt("1.234", "USD", rates), null);
  assert.equal(
    convertToBdt("10", "USD", { ...rates, usdToBdtRate: "0" }),
    null,
  );
  assert.equal(
    convertToBdt("10", "SGD", { ...rates, usdToSgdRate: "0" }),
    null,
  );
});

test("only the five supported currencies are accepted", () => {
  for (const currency of ["USD", "SGD", "EUR", "GBP", "BDT"]) {
    assert.equal(isCurrency(currency), true);
  }
  for (const currency of ["usd", "INR", "", null, undefined]) {
    assert.equal(isCurrency(currency), false);
  }
});

test("money totals add exact cents and ignore empty amounts", () => {
  assert.equal(sumMoneyAmounts(["0.10", "0.20", null, undefined, ""]), "0.30");
  assert.equal(
    sumMoneyAmounts(["9999999999999999.99", "0.02"]),
    "10000000000000000.01",
  );
  assert.equal(sumMoneyAmounts(["1.00", "-2.25"]), "-1.25");
  assert.equal(sumMoneyAmounts([]), "0.00");
});

test("saving a value keeps the original amount and recalculates BDT on the server", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  form.set("value", "130");
  form.set("valueCurrency", "SGD");
  form.set("valueBdt", "999999");

  const result = readProposalValues(form, "Test user");
  assert.ok(result.ok);
  assert.equal(result.values.valueOriginal, "130");
  assert.equal(result.values.valueCurrency, "SGD");
  assert.equal(result.values.valueBdt, "12500.00");
  assert.equal(result.values.usdToBdtRate, "125.00");
});

test("a blank value stores no currency or BDT amount", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  form.set("valueCurrency", "USD");
  const result = readProposalValues(form, "Test user");
  assert.ok(result.ok);
  assert.equal(result.values.valueOriginal, null);
  assert.equal(result.values.valueCurrency, null);
  assert.equal(result.values.valueBdt, null);
});

test("a value with an unsupported currency or bad rate is rejected", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  form.set("value", "100");
  form.set("valueCurrency", "INR");
  assert.equal(readProposalValues(form, "Test user").ok, false);
  form.set("valueCurrency", "USD");
  form.set("usdToBdtRate", "0");
  assert.equal(readProposalValues(form, "Test user").ok, false);
});
