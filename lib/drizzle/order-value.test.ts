import assert from "node:assert/strict";
import { test } from "node:test";
import { readOrderValues } from "./order-values";

function parse(amount: string, currency?: string) {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.3");
  form.set("eurToUsdRate", "1.1");
  form.set("usdToSgdRate", "1.30");
  form.set("clientOrderValue", amount);
  form.set("clientOrderUsdValue", "999999");
  if (currency !== undefined) form.set("clientOrderCurrency", currency);
  return readOrderValues(form, "Current user");
}

test("order value stores its original currency/amount and recomputes USD", () => {
  for (const [currency, expected] of [["USD", "100.00"], ["EUR", "110.00"], ["GBP", "130.00"]]) {
    const result = parse("100", currency);
    assert.ok(result.ok);
    assert.equal(result.values.clientOrderCurrency, currency);
    assert.equal(result.values.clientOrderOriginalValue, "100");
    assert.equal(result.values.clientOrderValue, expected);
  }
});

test("missing currency defaults to USD; clearing value clears both amounts", () => {
  const result = parse("12.34");
  assert.ok(result.ok);
  assert.equal(result.values.clientOrderCurrency, "USD");
  assert.equal(result.values.clientOrderValue, "12.34");
  const cleared = parse("", "EUR");
  assert.ok(cleared.ok);
  assert.equal(cleared.values.clientOrderOriginalValue, null);
  assert.equal(cleared.values.clientOrderValue, null);
});

test("order values reject invalid currencies, precision, negative amounts and overflow", () => {
  for (const [amount, currency] of [["1", "AUD"], ["-1", "USD"], ["1.001", "EUR"], ["9999999999999999.99", "GBP"]]) {
    assert.equal(parse(amount, currency).ok, false);
  }
});
