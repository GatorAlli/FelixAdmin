export type DatalistKind = "clients" | "systems";

// Trim suggestions and reject duplicates before Settings replaces the stored list.
export function readDatalistValues(
  input: unknown,
): { ok: true; values: string[] } | { ok: false; message: string } {
  if (!Array.isArray(input) || input.length > 500) {
    return {
      ok: false,
      message: "Enter a valid list with up to 500 suggestions.",
    };
  }
  const values: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > 200
    ) {
      return {
        ok: false,
        message: "Each suggestion must contain 1 to 200 characters.",
      };
    }
    const trimmed = value.trim();
    const key = trimmed.toUpperCase();
    if (seen.has(key))
      return { ok: false, message: `Duplicate suggestion: ${trimmed}.` };
    seen.add(key);
    values.push(trimmed);
  }
  return { ok: true, values };
}
