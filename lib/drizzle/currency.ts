// Currencies a proposal value can be entered in. BDT is the base for totals.
export const currencies = ["USD", "SGD", "EUR", "GBP", "BDT"] as const;

export type Currency = (typeof currencies)[number];

// Every rate means "1 unit of this currency = X BDT".
// Each proposal saves its own rates; these prefill new proposals.
export type ExchangeRates = {
  usdToBdtRate: string;
  sgdToBdtRate: string;
  eurToBdtRate: string;
  gbpToBdtRate: string;
};

export const DEFAULT_USD_TO_BDT = "125.00";
export const DEFAULT_SGD_TO_BDT = "96.15";
export const DEFAULT_EUR_TO_BDT = "150.00";
export const DEFAULT_GBP_TO_BDT = "175.00";

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  usdToBdtRate: DEFAULT_USD_TO_BDT,
  sgdToBdtRate: DEFAULT_SGD_TO_BDT,
  eurToBdtRate: DEFAULT_EUR_TO_BDT,
  gbpToBdtRate: DEFAULT_GBP_TO_BDT,
};

export function isCurrency(value: unknown): value is Currency {
  return currencies.includes(value as Currency);
}

// Parse decimal strings into scaled integers, avoiding floating-point rounding.
function scaledDecimal(value: string, scale: number, integerDigits: number) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  if (
    whole.replace(/^0+/, "").length > integerDigits ||
    fraction.length > scale
  )
    return null;
  return BigInt(whole + fraction.padEnd(scale, "0"));
}

export function isValidRate(value: string) {
  const parsed = scaledDecimal(value, 2, 10);
  return parsed !== null && parsed > BigInt(0);
}

const RATE_SCALE = BigInt(100); // Rates have at most 2 decimal places.
const MAX_CENTS = BigInt("1000000000000000000"); // numeric(18,2) limit

// The rate for one currency, scaled ×100. BDT is always 1 BDT = 1 BDT.
function bdtRate(currency: Currency, rates: ExchangeRates): bigint | null {
  if (currency === "BDT") return RATE_SCALE;
  const text = {
    USD: rates.usdToBdtRate,
    SGD: rates.sgdToBdtRate,
    EUR: rates.eurToBdtRate,
    GBP: rates.gbpToBdtRate,
  }[currency];
  const parsed = scaledDecimal(text, 2, 10);
  return parsed !== null && parsed > BigInt(0) ? parsed : null;
}

// Divide, rounding halves up (like Postgres numeric), then restore the decimal point.
function roundedCents(numerator: bigint, denominator: bigint): string | null {
  const cents = (numerator + denominator / BigInt(2)) / denominator;
  if (cents >= MAX_CENTS) return null;
  const text = cents.toString().padStart(3, "0");
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}

// amount × rate. Returns null for invalid inputs or results exceeding numeric(18,2).
export function convertToBdt(
  amount: string,
  currency: Currency,
  rates: ExchangeRates,
): string | null {
  const cents = scaledDecimal(amount, 2, 16);
  const rate = bdtRate(currency, rates);
  if (cents === null || rate === null) return null;
  return roundedCents(cents * rate, RATE_SCALE);
}

// bdtAmount ÷ rate. Used to show a saved BDT value in another currency.
export function convertFromBdt(
  bdtAmount: string,
  currency: Currency,
  rates: ExchangeRates,
): string | null {
  const cents = scaledDecimal(bdtAmount, 2, 16);
  const rate = bdtRate(currency, rates);
  if (cents === null || rate === null) return null;
  return roundedCents(cents * RATE_SCALE, rate);
}
