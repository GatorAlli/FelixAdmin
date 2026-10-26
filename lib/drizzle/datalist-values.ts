import { supplierColumns } from "./currency";

export type DatalistKind = "suppliers" | "customers" | "expenses";

export const defaultSupplierSuggestions = Object.keys(supplierColumns);
export const defaultExpenseSuggestions = [
  "FREIGHT: USA TO SINGAPORE",
  "FREIGHT: GERMANY TO SINGAPORE",
  "FREIGHT: CHINA TO SINGAPORE",
  "Bank Fee",
  "DHL Cost",
  "UPS Cost",
];

// Trim suggestions and reject duplicates before Settings replaces the stored list.
export function readDatalistValues(kind: DatalistKind, input: unknown):
  | { ok: true; values: string[] }
  | { ok: false; message: string } {
  if (!Array.isArray(input) || input.length > 500) {
    return { ok: false, message: "Enter a valid list with up to 500 suggestions." };
  }
  const values: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 200) {
      return { ok: false, message: "Each suggestion must contain 1 to 200 characters." };
    }
    const trimmed = value.trim();
    const key = trimmed.toUpperCase();
    if (seen.has(key)) return { ok: false, message: `Duplicate suggestion: ${trimmed}.` };
    seen.add(key);
    values.push(kind === "suppliers" ? key : trimmed);
  }
  return { ok: true, values };
}

// Addresses are optional and stay paired with the customer at the same index.
export function readCustomerAddresses(input: unknown, count: number):
  | { ok: true; values: (string | null)[] }
  | { ok: false; message: string } {
  if (!Array.isArray(input) || input.length !== count ||
      input.some(value => typeof value !== "string" || value.trim().length > 1000)) {
    return { ok: false, message: "Enter one optional address per customer, up to 1000 characters each." };
  }
  return { ok: true, values: input.map(value => value.trim() || null) };
}
