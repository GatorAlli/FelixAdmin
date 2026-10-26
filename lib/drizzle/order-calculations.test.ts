import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateOrderTotals } from "./order-calculations";

// One small order makes the fee bases and expected commission easy to follow.
const exampleOrder = {
  projectValue: "1000",
  projectCurrency: "USD" as const,
  suppliers: [
    { amount: "100", currency: "USD" as const },
    { amount: "100", currency: "GBP" as const },
  ],
  expenses: [{ amount: "50", currency: "EUR" as const }],
  gbpToUsdRate: "1.3",
  eurToUsdRate: "1.1",
  orderHandlingFee: "5",
  miscellaneousHandlingFee: "2",
};

test("fees use their respective costs and commission subtracts all costs", () => {
  assert.deepEqual(calculateOrderTotals(exampleOrder), {
    projectValue: "1000.00",
    materialCost: "230.00",
    miscellaneousCost: "55.00",
    orderHandlingCost: "11.50",
    miscellaneousHandlingCost: "1.10",
    commission: "702.40",
  });
  assert.equal(calculateOrderTotals({ ...exampleOrder, projectValue: "100" }).commission, "-197.60");
});

test("zero costs are valid and half-cent handling fees round upward", () => {
  const emptyOrder = calculateOrderTotals({ ...exampleOrder, suppliers: [], expenses: [] });
  assert.equal(emptyOrder.commission, "1000.00");
  const smallOrder = calculateOrderTotals({
    ...exampleOrder,
    suppliers: [{ amount: "0.01", currency: "USD" }],
    orderHandlingFee: "50",
  });
  assert.equal(smallOrder.orderHandlingCost, "0.01");
});

test("invalid or overflowing costs do not produce a misleading commission", () => {
  assert.equal(calculateOrderTotals({ ...exampleOrder, projectValue: "" }).commission, null);
  assert.equal(calculateOrderTotals({ ...exampleOrder, orderHandlingFee: "-5" }).commission, null);
  const overflowingOrder = calculateOrderTotals({
    ...exampleOrder,
    suppliers: [
      { amount: "9999999999999999.99", currency: "USD" },
      { amount: "0.01", currency: "USD" },
    ],
  });
  assert.equal(overflowingOrder.commission, null);
});

test("SGD applies to the project value, suppliers and expenses", () => {
  const totals = calculateOrderTotals({
    ...exampleOrder,
    projectValue: "1300",
    projectCurrency: "SGD",
    suppliers: [{ amount: "130", currency: "SGD" }],
    expenses: [{ amount: "13", currency: "SGD" }],
    usdToSgdRate: "1.30",
  });
  assert.equal(totals.commission, "884.80");
});
