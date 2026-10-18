import { convertToUsd, type Currency } from "./currency";

export type MiscellaneousExpense = {
  name: string;
  amount: string;
  currency: Currency;
};
export type ExpenseRow = MiscellaneousExpense & { id: number };
export type ExpenseOrder = {
  miscellaneousExpenses: MiscellaneousExpense[] | null;
  misCost: string | null;
  gbpToUsdRate?: string | null;
  eurToUsdRate?: string | null;
  usdToSgdRate?: string | null;
};

// Null means an older order; an empty array means all expenses were removed.
export function restoreExpenses(order: ExpenseOrder): MiscellaneousExpense[] {
  if (order.miscellaneousExpenses !== null) return order.miscellaneousExpenses;
  return order.misCost === null ? [] : [
    { name: "UNSPECIFIED", amount: order.misCost, currency: "USD" },
  ];
}

// Sum already-rounded USD amounts exactly, checking the numeric(18,2) limit.
export function sumUsdAmounts(amounts: string[]): string | null {
  const cents = amounts.reduce((total, amount) =>
    total + BigInt(amount.replace(".", "")), BigInt(0));
  if (cents >= BigInt("1000000000000000000")) return null;
  const text = cents.toString().padStart(3, "0");
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}

export function expenseUsdByName(order: ExpenseOrder): Map<string, string | null> {
  return new Map(restoreExpenses(order).map((expense) => [
    expense.name.trim().toUpperCase(),
    convertToUsd(expense.amount, expense.currency,
      order.gbpToUsdRate ?? "", order.eurToUsdRate ?? "", order.usdToSgdRate ?? undefined),
  ]));
}

// Use the same ordered list for table headers and cells so columns stay aligned.
export function expenseColumns(orders: ExpenseOrder[]): string[] {
  const names = new Set(orders.flatMap((order) =>
    restoreExpenses(order).map((expense) => expense.name.trim().toUpperCase()),
  ));
  const suggested = ["SHIPPING", "HANDLING"].filter((name) => names.delete(name));
  return [...suggested, ...Array.from(names).sort((a, b) => a.localeCompare(b))];
}
