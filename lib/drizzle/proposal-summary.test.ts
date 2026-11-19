import assert from "node:assert/strict";
import { test } from "node:test";
import {
  proposalsInYear,
  selectableYears,
  statusTotals,
} from "./proposal-summary";

const rows = [
  {
    referenceNumber: "FCL/Quote/2025/001",
    projectStatus: "Secured" as const,
    valueBdt: "1000.00",
  },
  {
    referenceNumber: "FCL/Quote/2026/001",
    projectStatus: "Current" as const,
    valueBdt: "12500.00",
  },
  {
    referenceNumber: "FCL/Quote/2026/002",
    projectStatus: "Current" as const,
    valueBdt: null,
  },
  {
    referenceNumber: "FCL/Quote/2026/003",
    projectStatus: "Lost" as const,
    valueBdt: "0.10",
  },
];

test("the year filter keeps only that year's references", () => {
  assert.equal(proposalsInYear(rows, "all").length, 4);
  assert.deepEqual(
    proposalsInYear(rows, "2026").map((row) => row.referenceNumber),
    ["FCL/Quote/2026/001", "FCL/Quote/2026/002", "FCL/Quote/2026/003"],
  );
  assert.equal(proposalsInYear(rows, "2024").length, 0);
});

test("selectable years run from the first year to the current year", () => {
  assert.deepEqual(selectableYears(2026), [2024, 2025, 2026]);
  assert.deepEqual(selectableYears(2024), [2024]);
  assert.deepEqual(selectableYears(2020), [2024]);
});

test("status totals count every proposal and add exact BDT cents", () => {
  assert.deepEqual(statusTotals(proposalsInYear(rows, "2026")), [
    { status: "Current", count: 2, totalBdt: "12500.00" },
    { status: "Secured", count: 0, totalBdt: "0.00" },
    { status: "Lost", count: 1, totalBdt: "0.10" },
    { status: "All", count: 3, totalBdt: "12500.10" },
  ]);
  assert.deepEqual(statusTotals([]).at(-1), {
    status: "All",
    count: 0,
    totalBdt: "0.00",
  });
});
