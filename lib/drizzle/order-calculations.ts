import { convertToUsd, type Currency } from "./currency";
import { sumUsdAmounts } from "./expenses";

// These keys identify the six totals and their selected display currencies.
export const panelFields = [
  ["projectValue", "PROJECT VALUE"],
  ["materialCost", "MATERIAL COST"],
  ["miscellaneousCost", "MISCELLANEOUS COST"],
  ["orderHandlingCost", "ORDER HANDLING COST"],
  ["miscellaneousHandlingCost", "MISCELLANEOUS HANDLING COST"],
  ["commission", "COMMISSION"],
] as const;
export type PanelKey = (typeof panelFields)[number][0];
export type PanelCurrencies = Record<PanelKey, Currency>;
export const DEFAULT_PANEL_CURRENCIES: PanelCurrencies = {
  projectValue: "USD",
  materialCost: "USD",
  miscellaneousCost: "USD",
  orderHandlingCost: "USD",
  miscellaneousHandlingCost: "USD",
  commission: "USD",
};

type AmountRow = {
  amount: string;
  currency: Currency;
  supplier?: string;
  name?: string;
};
type CalculationInputs = {
  projectValue: string;
  projectCurrency: Currency;
  suppliers: AmountRow[];
  expenses: AmountRow[];
  gbpToUsdRate: string;
  eurToUsdRate: string;
  usdToSgdRate?: string;
  orderHandlingFee: string;
  miscellaneousHandlingFee: string;
};

// Monetary results use exact cents. Negative commission represents a loss.
function formatCents(cents: bigint): string | null {
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  if (absolute >= BigInt("1000000000000000000")) return null;
  const text = absolute.toString().padStart(3, "0");
  return `${negative ? "-" : ""}${text.slice(0, -2)}.${text.slice(-2)}`;
}

function percentageOf(amount: string | null, percentage: string): string | null {
  if (amount === null || !/^\d+(?:\.\d{1,4})?$/.test(percentage)) return null;
  const [whole, fraction = ""] = percentage.split(".");
  if (whole.replace(/^0+/, "").length > 14) return null;
  const units = BigInt(whole + fraction.padEnd(4, "0"));
  const cents = BigInt(amount.replace(".", ""));
  // Four percentage decimals and division by 100: 5 means 5%, not 500%.
  const divisor = BigInt(1000000);
  return formatCents((cents * units + divisor / BigInt(2)) / divisor);
}

// Calculate in USD first; the form converts these results for display if requested.
export function calculateOrderTotals(input: CalculationInputs): Record<PanelKey, string | null> {
  function total(rows: AmountRow[]) {
    const amounts: string[] = [];
    for (const row of rows) {
      if (!row.amount && !row.name && !row.supplier) continue;
      const amount = convertToUsd(row.amount, row.currency, input.gbpToUsdRate, input.eurToUsdRate, input.usdToSgdRate);
      if (amount === null) return null;
      amounts.push(amount);
    }
    return sumUsdAmounts(amounts);
  }
  const projectValue = convertToUsd(input.projectValue, input.projectCurrency, input.gbpToUsdRate, input.eurToUsdRate, input.usdToSgdRate);
  const materialCost = total(input.suppliers);
  const miscellaneousCost = total(input.expenses);
  const orderHandlingCost = percentageOf(materialCost, input.orderHandlingFee);
  const miscellaneousHandlingCost = percentageOf(miscellaneousCost, input.miscellaneousHandlingFee);
  // Commission is the project value minus costs and their respective handling fees.
  const deductions = [materialCost, miscellaneousCost, orderHandlingCost, miscellaneousHandlingCost];
  const commission = projectValue !== null && deductions.every(value => value !== null)
    ? formatCents(BigInt(projectValue.replace(".", "")) - deductions.reduce(
        (sum, value) => sum + BigInt(value!.replace(".", "")), BigInt(0),
      ))
    : null;
  return { projectValue, materialCost, miscellaneousCost, orderHandlingCost, miscellaneousHandlingCost, commission };
}
