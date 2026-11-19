import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatProposalReference,
  referenceYearPrefix,
} from "./proposal-reference";

test("references use FCL/Quote/YYYY/NNN with at least three digits", () => {
  assert.equal(formatProposalReference(2026, BigInt(1)), "FCL/Quote/2026/001");
  assert.equal(formatProposalReference(2026, BigInt(42)), "FCL/Quote/2026/042");
  assert.equal(
    formatProposalReference(2026, BigInt(1234)),
    "FCL/Quote/2026/1234",
  );
});

test("the year prefix matches references from that year only", () => {
  const prefix = referenceYearPrefix(2026);
  assert.equal(prefix, "FCL/Quote/2026/");
  assert.ok(formatProposalReference(2026, BigInt(7)).startsWith(prefix));
  assert.ok(!formatProposalReference(2025, BigInt(7)).startsWith(prefix));
});

test("invalid years or sequences are rejected", () => {
  assert.throws(() => formatProposalReference(999, BigInt(1)), RangeError);
  assert.throws(() => formatProposalReference(10000, BigInt(1)), RangeError);
  assert.throws(() => formatProposalReference(2026.5, BigInt(1)), RangeError);
  assert.throws(() => formatProposalReference(2026, BigInt(0)), RangeError);
});
