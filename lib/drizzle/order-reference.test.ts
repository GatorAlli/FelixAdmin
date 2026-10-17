import assert from "node:assert/strict";
import { test } from "node:test";
import { formatOrderReference } from "./order-reference";

test("references pad yearly sequence numbers without using the primary key", () => {
  assert.equal(formatOrderReference(2026, BigInt("1")), "FCL/FPO/2026/001");
  assert.equal(formatOrderReference(2026, BigInt("6")), "FCL/FPO/2026/006");
  assert.equal(formatOrderReference(2027, BigInt("1")), "FCL/FPO/2027/001");
});

test("reference numbers grow past three digits without truncation", () => {
  assert.equal(formatOrderReference(2026, BigInt("1000")), "FCL/FPO/2026/1000");
  assert.equal(
    formatOrderReference(2026, BigInt("9007199254740993")),
    "FCL/FPO/2026/9007199254740993",
  );
});

test("references reject invalid years and nonpositive sequences", () => {
  assert.throws(() => formatOrderReference(2026, BigInt("0")), RangeError);
  assert.throws(() => formatOrderReference(2026, BigInt("-1")), RangeError);
  assert.throws(() => formatOrderReference(2026.5, BigInt("1")), RangeError);
  assert.throws(() => formatOrderReference(999, BigInt("1")), RangeError);
});
