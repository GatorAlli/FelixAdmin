import assert from "node:assert/strict";
import { test } from "node:test";
import { readOrderValues } from "./order-values";
import { expenseColumns, expenseUsdByName, restoreExpenses, sumUsdAmounts, type ExpenseOrder } from "./expenses";

function parse(rows: [string, string, string][]) {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.3");
  form.set("eurToUsdRate", "1.1");
  form.set("misCost", "999999"); // The server must ignore forged totals.
  for (const [name, amount, currency] of rows) {
    form.append("expenseName", name);
    form.append("expenseAmount", amount);
    form.append("expenseCurrency", currency);
  }
  return readOrderValues(form, "Current user");
}

test("expenses retain original details, normalize names and sum converted USD", () => {
  const result = parse([[" shipping ", "100", "USD"], ["handling", "50", "GBP"], ["insurance", "20", "EUR"]]);
  assert.ok(result.ok);
  assert.equal(result.values.misCost, "187.00");
  assert.equal(result.values.createdBy, "Current user");
  assert.deepEqual(result.values.miscellaneousExpenses, [
    { name: "SHIPPING", amount: "100", currency: "USD" },
    { name: "HANDLING", amount: "50", currency: "GBP" },
    { name: "INSURANCE", amount: "20", currency: "EUR" },
  ]);
});

test("duplicate names, incomplete rows, invalid currencies and invalid amounts fail", () => {
  const cases: [string, string, string][][] = [
    [["SHIPPING", "1", "USD"], [" shipping ", "2", "GBP"]],
    [["SHIPPING", "", "USD"]], [["", "1", "USD"]],
    [["SHIPPING", "1", "AUD"]], [["SHIPPING", "-1", "USD"]],
    [["SHIPPING", "1.001", "USD"]],
    [["SHIPPING", "9999999999999999.99", "GBP"]],
    [["SHIPPING", "9999999999999999.99", "USD"], ["HANDLING", "0.01", "USD"]],
  ];
  for (const rows of cases) assert.equal(parse(rows).ok, false, JSON.stringify(rows));
  const incomplete = new FormData();
  incomplete.set("gbpToUsdRate", "1.3"); incomplete.set("eurToUsdRate", "1.1");
  incomplete.set("expenseName", "SHIPPING");
  assert.equal(readOrderValues(incomplete, "Current user").ok, false);
});

test("all expenses removed clears details and total; blank rows are optional", () => {
  for (const rows of [[], [["", "", "USD"]]] as [string, string, string][][]) {
    const result = parse(rows);
    assert.ok(result.ok);
    assert.equal(result.values.misCost, null);
    assert.deepEqual(result.values.miscellaneousExpenses, []);
  }
});

test("restoring preserves detail rows; only legacy totals become UNSPECIFIED", () => {
  const legacy = { miscellaneousExpenses: null, misCost: "0.00" };
  assert.deepEqual(restoreExpenses(legacy), [{ name: "UNSPECIFIED", amount: "0.00", currency: "USD" }]);
  assert.deepEqual(restoreExpenses({miscellaneousExpenses: null, misCost: null}), []);
  assert.deepEqual(restoreExpenses({miscellaneousExpenses: [], misCost: "100.00"}), []);
  const original = [{name: "SHIPPING", amount: "50", currency: "GBP" as const}];
  assert.deepEqual(restoreExpenses({miscellaneousExpenses: original, misCost: "65.00"}), original);
});

test("summary expense columns and cells align across different orders", () => {
  const orders: ExpenseOrder[] = [
    {misCost: "65.00", miscellaneousExpenses: [{name: "HANDLING", amount: "50", currency: "GBP"}], gbpToUsdRate: "1.3"},
    {misCost: "2.20", miscellaneousExpenses: [{name: "INSURANCE", amount: "2", currency: "EUR"}], eurToUsdRate: "1.1"},
    {misCost: "3.00", miscellaneousExpenses: null},
    {misCost: "1.00", miscellaneousExpenses: [{name: "SHIPPING", amount: "1", currency: "USD"}]},
  ];
  const headers = expenseColumns(orders);
  assert.deepEqual(headers, ["SHIPPING", "HANDLING", "INSURANCE", "UNSPECIFIED"]);
  const cells = orders.map(order => {
    const amounts = expenseUsdByName(order);
    return headers.map(name => amounts.get(name) ?? "");
  });
  assert.deepEqual(cells, [
    ["", "65.00", "", ""], ["", "", "2.20", ""],
    ["", "", "", "3.00"], ["1.00", "", "", ""],
  ]);
  assert.deepEqual(expenseColumns([]), []);
});

test("USD sums avoid floating point errors and reject combined overflow", () => {
  assert.equal(sumUsdAmounts(["0.10", "0.20"]), "0.30");
  assert.equal(sumUsdAmounts(["9999999999999999.99"]), "9999999999999999.99");
  assert.equal(sumUsdAmounts(["9999999999999999.99", "0.01"]), null);
});
