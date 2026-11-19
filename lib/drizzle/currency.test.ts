import assert from "node:assert/strict";
import { test } from "node:test";
import {
  convertFromBdt,
  convertToBdt,
  isCurrency,
  type ExchangeRates,
} from "./currency";
import { readProposalValues } from "./proposal-values";
import { sumMoneyAmounts } from "../format-money";

// Every rate is "1 unit = X BDT".
const rates: ExchangeRates = {
  usdToBdtRate: "125.00",
  sgdToBdtRate: "96.15",
  eurToBdtRate: "150.00",
  gbpToBdtRate: "175.00",
};

// Money stays in decimal strings so large amounts do not lose cents.
test("every currency converts directly to BDT using the proposal's rates", () => {
  assert.equal(convertToBdt("100", "BDT", rates), "100.00");
  assert.equal(convertToBdt("100", "USD", rates), "12500.00");
  assert.equal(convertToBdt("100", "SGD", rates), "9615.00");
  assert.equal(convertToBdt("100", "EUR", rates), "15000.00");
  assert.equal(convertToBdt("100", "GBP", rates), "17500.00");
});

test("BDT converts back to any currency for display", () => {
  assert.equal(convertFromBdt("12500", "USD", rates), "100.00");
  assert.equal(convertFromBdt("9615", "SGD", rates), "100.00");
  assert.equal(convertFromBdt("15000", "EUR", rates), "100.00");
  assert.equal(convertFromBdt("17500", "GBP", rates), "100.00");
  assert.equal(convertFromBdt("100", "BDT", rates), "100.00");
  // 100 BDT ÷ 96.15 = 1.040041… SGD
  assert.equal(convertFromBdt("100", "SGD", rates), "1.04");
  assert.equal(convertFromBdt("-1", "USD", rates), null);
  assert.equal(
    convertFromBdt("100", "USD", { ...rates, usdToBdtRate: "0" }),
    null,
  );
});

test("conversion rounds halves up and rejects invalid amounts, rates or overflow", () => {
  // 0.01 SGD × 96.15 = 0.9615 BDT, which rounds to 0.96
  assert.equal(convertToBdt("0.01", "SGD", rates), "0.96");
  // 0.5 BDT ÷ 125 = 0.004 USD, which rounds to 0.00; 0.63 ÷ 125 = 0.00504 → 0.01
  assert.equal(convertFromBdt("0.5", "USD", rates), "0.00");
  assert.equal(convertFromBdt("0.63", "USD", rates), "0.01");
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
    convertToBdt("10", "GBP", { ...rates, gbpToBdtRate: "1.234" }),
    null,
  );
  // A bad rate for one currency does not affect the others.
  assert.equal(
    convertToBdt("10", "EUR", { ...rates, gbpToBdtRate: "0" }),
    "1500.00",
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
  assert.equal(result.values.valueBdt, "12499.50");
  assert.equal(result.values.sgdToBdtRate, "96.15");
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
