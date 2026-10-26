// Built-in supplier labels map to their stored USD amount columns.
export const supplierColumns = {
  TRANE: "trane",
  BELIMO: "belimo",
  DANFOSS: "danfoss",
  HONEYWELL: "honeywell",
  REGELTECHNIK: "regeltechnik",
  DWYER: "dwyer",
  ALPS: "alps",
  "CONTROL 4": "control4",
  LUTRON: "lutron",
  "LANDIS+GYR": "landisGyr",
  RBH: "rbh",
  PROSTAR: "prostar",
  GISSMATIC: "gissmatic",
  ZKTECO: "zkteco",
  ADTESHIA: "adteshia",
  FIKE: "fike",
  TECOFI: "tecofi",
  SEWO: "sewo",
  EBELCO: "ebelco",
  DOOYA: "dooya",
  POGO: "pogo",
  "PARK HELP": "parkHelp",
  FOSHAN: "foshan",
  KELE: "kele",
  MULTICABLE: "multicable",
  DEYZ: "deyz",
  SIMENS: "simens",
  "FLASH TURTLE": "flashTurtle",
  SERVO: "servo",
  HABOO: "haboo",
  OTHERS: "others",
} as const;

export type SupplierKey = (typeof supplierColumns)[keyof typeof supplierColumns];


export type Currency = "USD" | "EUR" | "GBP" | "SGD";
export type SupplierCurrencyDetail = {
  supplier: SupplierKey;
  amount: string;
  currency: Currency;
};
export type CustomSupplierDetail = { name: string; amount: string; currency: Currency };
export type SupplierRow = {
  id: number;
  supplier: string;
  amount: string;
  currency: Currency;
};

// Fixed, editable defaults supplied for new orders.
export const DEFAULT_GBP_TO_USD = "1.40";
export const DEFAULT_EUR_TO_USD = "1.20";

export const DEFAULT_USD_TO_SGD = "1.30";

export function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "EUR" || value === "GBP" || value === "SGD";
}

// Parse decimal strings into scaled integers, avoiding floating-point rounding.
function scaledDecimal(value: string, scale: number, integerDigits: number) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  if (whole.replace(/^0+/, "").length > integerDigits || fraction.length > scale)
    return null;
  return BigInt(whole + fraction.padEnd(scale, "0"));
}

export function isValidRate(value: string) {
  const parsed = scaledDecimal(value, 2, 10);
  return parsed !== null && parsed > BigInt(0);
}

// Returns null for incomplete/invalid inputs or amounts exceeding numeric(18,2).
// Positive halfway values round up, matching Postgres numeric rounding.
export function convertToUsd(
  amount: string,
  currency: Currency,
  gbpToUsdRate: string,
  eurToUsdRate: string,
  usdToSgdRate: string = DEFAULT_USD_TO_SGD,
): string | null {
  const cents = scaledDecimal(amount, 2, 16);
  if (cents === null) return null;
  const rateText = currency === "GBP" ? gbpToUsdRate :
    currency === "EUR" ? eurToUsdRate : currency === "SGD" ? usdToSgdRate : "1";
  const rate = scaledDecimal(rateText, 8, 10);
  if (rate === null || rate <= BigInt(0)) return null;
  const divisor = BigInt(100000000);
  // SGD uses the inverse rate: 1 USD = rate SGD.
  const usdCents = currency === "SGD"
    ? (cents * divisor + rate / BigInt(2)) / rate
    : (cents * rate + divisor / BigInt(2)) / divisor;
  if (usdCents >= BigInt("1000000000000000000")) return null;
  const text = usdCents.toString().padStart(3, "0");
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}

// Restore original amounts when available; older orders only have USD columns.
export function restoreSupplierRows(order: {
  supplierCurrencyDetails: SupplierCurrencyDetail[] | null;
  customSupplierDetails?: CustomSupplierDetail[] | null;
} & Partial<Record<SupplierKey, string | null>>): SupplierRow[] {
  const legacy = Object.entries(supplierColumns).flatMap(([name, column], index) => {
    const usdAmount = order[column];
    if (usdAmount == null) return [];
    const original = order.supplierCurrencyDetails?.find(
      (detail) => detail.supplier === column,
    );
    return [{
      id: index + 1,
      supplier: name,
      amount: original?.amount ?? usdAmount,
      currency: original?.currency ?? "USD",
    }];
  });
  return [...legacy, ...(order.customSupplierDetails ?? []).map((detail, index) => ({
    id: Object.keys(supplierColumns).length + index + 1,
    supplier: detail.name, amount: detail.amount, currency: detail.currency,
  }))];
}

// Convert USD panel values using the saved per-order rate direction.
// Signed amounts are supported because commission may be negative.
export function convertFromUsd(
  amount: string,
  currency: Currency,
  gbpToUsdRate: string,
  eurToUsdRate: string,
  usdToSgdRate: string = DEFAULT_USD_TO_SGD,
): string | null {
  const negative = amount.startsWith("-");
  const cents = scaledDecimal(negative ? amount.slice(1) : amount, 2, 16);
  if (cents === null) return null;
  const rateText = currency === "GBP" ? gbpToUsdRate :
    currency === "EUR" ? eurToUsdRate : currency === "SGD" ? usdToSgdRate : "1";
  const rate = scaledDecimal(rateText, 8, 10);
  if (rate === null || rate <= BigInt(0)) return null;
  const scale = BigInt(100000000);
  const convertedCents = currency === "SGD"
    ? (cents * rate + scale / BigInt(2)) / scale
    : (cents * scale + rate / BigInt(2)) / rate;
  if (convertedCents >= BigInt("1000000000000000000")) return null;
  const text = convertedCents.toString().padStart(3, "0");
  const sign = negative && convertedCents !== BigInt(0) ? "-" : "";
  return `${sign}${text.slice(0, -2)}.${text.slice(-2)}`;
}
