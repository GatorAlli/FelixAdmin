import assert from "node:assert/strict";
import { test } from "node:test";
import { readOrderValues } from "./order-values";

function parse(value?: string) {
  const form = new FormData();
  form.set("gbpToUsdRate", "1.40");
  form.set("eurToUsdRate", "1.20");
  form.set("usdToSgdRate", "1.30");
  if (value !== undefined) form.set("importedBy", value);
  return readOrderValues(form, "Test user");
}

test("Imported By accepts both choices and leaves older/blank orders unset", () => {
  for (const value of ["Felix", "Customer", "", undefined]) {
    const result = parse(value);
    assert.ok(result.ok);
    assert.equal(result.values.importedBy, value || null);
  }
});
test("Imported By rejects unsupported choices on the server", () => {
  assert.equal(parse("Someone else").ok, false);
});
