import assert from "node:assert/strict";
import { test } from "node:test";
import { readOrderValues } from "./order-values";

function form() {
  const data = new FormData();
  data.set("gbpToUsdRate", "1.3");
  data.set("eurToUsdRate", "1.1");
  return data;
}

test("project notes and percentage settings are included in create/update values", () => {
  const input = form();
  input.set("projectNotes", "First line\nSecond line");
  input.set("orderHandlingFee", "5.1250");
  input.set("miscellaneousHandlingFee", "0");
  const result = readOrderValues(input, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.projectNotes, "First line\nSecond line");
  assert.equal(result.values.orderHandlingFee, "5.1250");
  assert.equal(result.values.miscellaneousHandlingFee, "0");
});

test("blank notes and fees save as null, clearing previous values", () => {
  const result = readOrderValues(form(), "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.projectNotes, null);
  assert.equal(result.values.orderHandlingFee, null);
  assert.equal(result.values.miscellaneousHandlingFee, null);
});

test("both percentage settings reject negative, malformed, excessive precision and overflow inputs", () => {
  for (const field of ["orderHandlingFee", "miscellaneousHandlingFee"]) {
    for (const value of ["-1", "NaN", "Infinity", "1e3", "1.12345", "100000000000000"]) {
      const input = form();
      input.set(field, value);
      assert.equal(readOrderValues(input, "Current user").ok, false, `${field}: ${value}`);
    }
  }
});
