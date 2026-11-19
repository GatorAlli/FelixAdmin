// Currencies a proposal value can be entered in. BDT is the base for totals.
export const currencies = ["USD", "SGD", "EUR", "GBP", "BDT"] as const;

export type Currency = (typeof currencies)[number];

// Each proposal saves its own rates; these prefill new proposals.
export type ExchangeRates = {
  gbpToUsdRate: string;
  eurToUsdRate: string;
  usdToSgdRate: string;
  usdToBdtRate: string;
};

export const DEFAULT_GBP_TO_USD = "1.40";
export const DEFAULT_EUR_TO_USD = "1.20";
export const DEFAULT_USD_TO_SGD = "1.30";
export const DEFAULT_USD_TO_BDT = "125.00";

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  gbpToUsdRate: DEFAULT_GBP_TO_USD,
  eurToUsdRate: DEFAULT_EUR_TO_USD,
  usdToSgdRate: DEFAULT_USD_TO_SGD,
  usdToBdtRate: DEFAULT_USD_TO_BDT,
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

// Returns null for incomplete/invalid inputs or amounts exceeding numeric(18,2).
// Non-BDT values go through USD, but the whole chain is one exact calculation,
// so the result is rounded once (halves round up, like Postgres numeric).
export function convertToBdt(
  amount: string,
  currency: Currency,
  rates: ExchangeRates,
): string | null {
  const cents = scaledDecimal(amount, 2, 16);
  if (cents === null) return null;

  const rate = (text: string) => {
    const parsed = scaledDecimal(text, 8, 10);
    return parsed !== null && parsed > BigInt(0) ? parsed : null;
  };
  const scale = BigInt(100000000);
  const usdToBdt = rate(rates.usdToBdtRate);
  if (usdToBdt === null) return null;

  // bdtCents = cents × numerator ÷ denominator
  let numerator = BigInt(1);
  let denominator = BigInt(1);
  if (currency === "USD") {
    numerator = usdToBdt;
    denominator = scale;
  } else if (currency === "GBP" || currency === "EUR") {
    const toUsd = rate(
      currency === "GBP" ? rates.gbpToUsdRate : rates.eurToUsdRate,
    );
    if (toUsd === null) return null;
    numerator = toUsd * usdToBdt;
    denominator = scale * scale;
  } else if (currency === "SGD") {
    // SGD uses the inverse rate: 1 USD = rate SGD.
    const usdToSgd = rate(rates.usdToSgdRate);
    if (usdToSgd === null) return null;
    numerator = usdToBdt;
    denominator = usdToSgd;
  }

  const bdtCents = (cents * numerator + denominator / BigInt(2)) / denominator;
  if (bdtCents >= BigInt("1000000000000000000")) return null;
  const text = bdtCents.toString().padStart(3, "0");
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}
