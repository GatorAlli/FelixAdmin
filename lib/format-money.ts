const integerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Format decimal strings without losing cents on large database numeric values.
export function formatMoney(value: string | null | undefined, fallback = ""): string {
  if (value == null || value.trim() === "") return fallback;
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return fallback;
  const fraction = match[3] ?? "";
  let cents = BigInt(match[2]) * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  if (fraction.length > 2 && fraction[2] >= "5") cents += BigInt(1);
  const sign = match[1] && cents !== BigInt(0) ? "-" : "";
  return `${sign}${integerFormatter.format(cents / BigInt(100))}.${(cents % BigInt(100)).toString().padStart(2, "0")}`;
}

// Preserve incomplete decimals while typing; calculations receive no commas.
export function parseMoneyInput(value: string): string | null {
  const raw = value.replace(/,/g, "").trim();
  if (!/^\d*(?:\.\d{0,2})?$/.test(raw)) return null;
  const [whole] = raw.split(".");
  if (whole.replace(/^0+/, "").length > 16) return null;
  return raw.startsWith(".") ? `0${raw}` : raw;
}

export function formatMoneyDraft(value: string): string {
  const [whole, fraction] = value.split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction === undefined ? "" : `.${fraction}`);
}
