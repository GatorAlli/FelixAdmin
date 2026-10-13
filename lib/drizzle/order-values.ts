import type { NewOrder } from "./schema";
import { supplierColumns, type SupplierKey, type SupplierCurrencyDetail,
  isCurrency, isValidRate, convertToUsd } from "./currency";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalNumber(formData: FormData, name: string) {
  const value = readText(formData, name);
  if (!value) return { value: null, error: null };

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { value: null, error: `${name} must be a non-negative number.` };
  }

  // Drizzle/Postgres numeric fields accept decimal values as strings.
  return { value, error: null };
}

function readOptionalDate(formData: FormData, name: string) {
  const value = readText(formData, name);
  if (!value) return { value: null, error: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { value: null, error: `${name} must be a valid date.` };
  }
  return { value, error: null };
}

// Both creating and editing use the same field validation and conversion.
export function readOrderValues(formData: FormData, authenticatedUsername: string):
  | { ok: true; values: Omit<NewOrder, "sl" | "felixOrderRef"> }
  | { ok: false; message: string } {
  // The server supplies this name after authentication; FormData cannot override it.
  const createdBy = authenticatedUsername.trim();
  if (!createdBy) {
    return { ok: false, message: "Created by is required." };
  }

  const gbpToUsdRate = readText(formData, "gbpToUsdRate");
  const eurToUsdRate = readText(formData, "eurToUsdRate");
  if (!isValidRate(gbpToUsdRate) || !isValidRate(eurToUsdRate)) {
    return { ok: false, message: "Both exchange rates must be positive decimals with at most 8 decimal places." };
  }

  const numericFields = {
    clientOrderValue: readOptionalNumber(formData, "clientOrderValue"),
    emiCost: readOptionalNumber(formData, "emiCost"),
    misCost: readOptionalNumber(formData, "misCost"),
    totalOrderCost: readOptionalNumber(formData, "totalOrderCost"),
    paymentReceived: readOptionalNumber(formData, "paymentReceived"),
    felixOhAndProfit: readOptionalNumber(formData, "felixOhAndProfit"),
  };
  const numericError = Object.values(numericFields).find(
    (field) => field.error,
  );
  if (numericError?.error) {
    return { ok: false, message: numericError.error };
  }

  const dateFields = {
    felixSoDate: readOptionalDate(formData, "felixSoDate"),
    clientOrderDate: readOptionalDate(formData, "clientOrderDate"),
    lcDate: readOptionalDate(formData, "lcDate"),
    latestDateOfShipment: readOptionalDate(formData, "latestDateOfShipment"),
    dateOfExpiry: readOptionalDate(formData, "dateOfExpiry"),
  };
  const dateError = Object.values(dateFields).find((field) => field.error);
  if (dateError?.error) {
    return { ok: false, message: dateError.error };
  }

  const supplierNames = formData.getAll("supplier");
  const supplierAmounts = formData.getAll("supplierAmount");
  const supplierCurrencies = formData.getAll("supplierCurrency");
  const supplierCurrencyDetails: SupplierCurrencyDetail[] = [];
  if (supplierNames.length !== supplierAmounts.length ||
      supplierNames.length !== supplierCurrencies.length) {
    return { ok: false, message: "Supplier rows are incomplete." };
  }
  const supplierValues: Partial<Record<SupplierKey, string>> = {};
  const selectedSuppliers: string[] = [];

  for (let index = 0; index < supplierNames.length; index++) {
    const supplierName = supplierNames[index];
    const supplierAmount = supplierAmounts[index];
    const name = typeof supplierName === "string" ? supplierName.trim() : "";
    const amount =
      typeof supplierAmount === "string" ? supplierAmount.trim() : "";

    // The initial blank supplier row is optional; partially filled rows are not.
    if (!name && !amount) continue;
    if (!name || !amount) {
      return {
        ok: false,
        message: "Complete both supplier and amount for each row.",
      };
    }

    if (!Object.prototype.hasOwnProperty.call(supplierColumns, name)) {
      return { ok: false, message: `Unknown supplier: ${name}.` };
    }
    const column = supplierColumns[name as keyof typeof supplierColumns];
    if (!column) {
      return { ok: false, message: `Unknown supplier: ${name}.` };
    }
    if (supplierValues[column] !== undefined) {
      return { ok: false, message: `${name} can only be entered once.` };
    }

    const currency = supplierCurrencies[index];
    if (!isCurrency(currency)) {
      return { ok: false, message: `Choose a valid currency for ${name}.` };
    }
    const usdAmount = convertToUsd(amount, currency, gbpToUsdRate, eurToUsdRate);
    if (usdAmount === null) {
      return { ok: false, message: `Enter a valid amount for ${name} (up to 2 decimal places and within the supported range).` };
    }

    supplierValues[column] = usdAmount;
    supplierCurrencyDetails.push({ supplier: column, amount, currency });
    selectedSuppliers.push(name);
  }

  const values = {
    createdBy,
    gbpToUsdRate,
    eurToUsdRate,
    supplierCurrencyDetails,
    felixSoNo: readText(formData, "felixSoNo") || null,
    felixSoDate: dateFields.felixSoDate.value,
    emiOrderRef: readText(formData, "emiOrderRef") || null,
    paymentMode: readText(formData, "paymentMode") || null,
    clientOrderRef: readText(formData, "clientOrderRef") || null,
    clientOrderDate: dateFields.clientOrderDate.value,
    clientOrderValue: numericFields.clientOrderValue.value,
    projectName: readText(formData, "projectName") || null,
    clientName: readText(formData, "clientName") || null,
    endUser: readText(formData, "endUser") || null,
    productSystem: readText(formData, "productSystem") || null,
    ttOrLcRef: readText(formData, "ttOrLcRef") || null,
    lcDate: dateFields.lcDate.value,
    latestDateOfShipment: dateFields.latestDateOfShipment.value,
    dateOfExpiry: dateFields.dateOfExpiry.value,
    consignee: readText(formData, "consignee") || null,
    orderHandledBy: readText(formData, "orderHandledBy") || null,
    suppliers: selectedSuppliers.length ? selectedSuppliers.join(", ") : null,
    // Clear amounts for suppliers that were removed from the form during editing.
    ...(Object.fromEntries(
      Object.values(supplierColumns).map((column) => [column, null]),
    ) as Record<SupplierKey, null>),
    ...supplierValues,
    emiCost: numericFields.emiCost.value,
    misCost: numericFields.misCost.value,
    totalOrderCost: numericFields.totalOrderCost.value,
    paymentReceived: numericFields.paymentReceived.value,
    felixOhAndProfit: numericFields.felixOhAndProfit.value,
    remarks: readText(formData, "remarks") || null,
  };

  return { ok: true, values };
}

