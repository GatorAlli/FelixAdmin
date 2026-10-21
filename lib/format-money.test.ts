import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoney } from "./format-money";

test("money displays grouping, two decimals, zero and negative amounts", () => {
  assert.equal(formatMoney("8900000"), "8,900,000.00");
  assert.equal(formatMoney("1234.5"), "1,234.50");
  assert.equal(formatMoney("0"), "0.00");
  assert.equal(formatMoney("-1190.14"), "-1,190.14");
});
test("money retains exact cents for large values and rounds decimal strings", () => {
  assert.equal(formatMoney("9999999999999999.99"), "9,999,999,999,999,999.99");
  assert.equal(formatMoney("999.995"), "1,000.00");
  assert.equal(formatMoney("-0.001"), "0.00");
});
test("missing and invalid money retains the requested placeholder", () => {
  for (const value of [null, undefined, "", "NaN"]) {
    assert.equal(formatMoney(value), "");
    assert.equal(formatMoney(value, "—"), "—");
  }
});

test("editable money accepts pasted grouping and partial decimals without accepting invalid amounts", async () => {
  const { parseMoneyInput, formatMoneyDraft } = await import("./format-money");
  assert.equal(parseMoneyInput("8,900,000.00"), "8900000.00");
  assert.equal(parseMoneyInput(""), "");
  assert.equal(parseMoneyInput(".5"), "0.5");
  assert.equal(formatMoneyDraft("8900000."), "8,900,000.");
  assert.equal(formatMoneyDraft("8900000.5"), "8,900,000.5");
  for (const value of ["-1", "1e3", "1.234", "oops", "10000000000000000"]) {
    assert.equal(parseMoneyInput(value), null);
  }
});
