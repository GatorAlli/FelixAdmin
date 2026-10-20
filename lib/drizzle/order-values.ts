import type { NewOrder } from "./schema";
import { DEFAULT_PANEL_CURRENCIES, panelFields } from "./order-calculations";
import { sumUsdAmounts, type MiscellaneousExpense } from "./expenses";
import { supplierColumns, type SupplierKey, type SupplierCurrencyDetail, type CustomSupplierDetail,
  isCurrency, isValidRate, convertToUsd } from "./currency";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Fees are optional percentages, with up to four decimal places.
function readOptionalFee(formData: FormData, name: string) {
  const value = readText(formData, name);
  if (!value) return { value: null, error: null };
  const [whole] = value.split(".");
  if (!/^\d+(?:\.\d{1,4})?$/.test(value) || whole.replace(/^0+/, "").length > 14) {
    return { value: null, error: `${name} must be a non-negative percentage with at most 4 decimal places.` };
  }
  return { value, error: null };
}

// Both creating and editing use the same field validation and conversion.
export function readOrderValues(formData: FormData, authenticatedUsername: string, allowedSupplierNames: readonly string[] = Object.keys(supplierColumns)):
  | { ok: true; values: Omit<NewOrder, "sl" | "felixOrderRef" | "createdDate" | "orderManagerAccess"> }
  | { ok: false; message: string } {
  // The server supplies this name after authentication; FormData cannot override it.
  const createdBy = authenticatedUsername.trim();
  if (!createdBy) {
    return { ok: false, message: "Created by is required." };
  }

  const gbpToUsdRate = readText(formData, "gbpToUsdRate");
  const eurToUsdRate = readText(formData, "eurToUsdRate");
  const usdToSgdRate = readText(formData, "usdToSgdRate");
  if (!isValidRate(gbpToUsdRate) || !isValidRate(eurToUsdRate) || !isValidRate(usdToSgdRate)) {
    return { ok: false, message: "All three exchange rates must be positive decimals with at most 2 decimal places." };
  }

  const orderHandlingFee = readOptionalFee(formData, "orderHandlingFee");
  const miscellaneousHandlingFee = readOptionalFee(formData, "miscellaneousHandlingFee");
  const feeError = orderHandlingFee.error ?? miscellaneousHandlingFee.error;
  if (feeError) return { ok: false, message: feeError };

  // Existing clientOrderValue stays in USD for summaries; keep the input separately.
  const clientOrderOriginalValue = readText(formData, "clientOrderValue");
  const clientOrderCurrency = formData.get("clientOrderCurrency") ?? "USD";
  if (!isCurrency(clientOrderCurrency)) {
    return { ok: false, message: "Choose a valid currency for the order value." };
  }
  const clientOrderUsdValue = clientOrderOriginalValue
    ? convertToUsd(clientOrderOriginalValue, clientOrderCurrency, gbpToUsdRate, eurToUsdRate, usdToSgdRate)
    : null;
  if (clientOrderOriginalValue && clientOrderUsdValue === null) {
    return { ok: false, message: "Enter a valid order value (up to 2 decimal places and within the supported range)." };
  }

  const supplierNames = formData.getAll("supplier");
  const supplierAmounts = formData.getAll("supplierAmount");
  const supplierCurrencies = formData.getAll("supplierCurrency");
  const supplierCurrencyDetails: SupplierCurrencyDetail[] = [];
  if (supplierNames.length !== supplierAmounts.length ||
      supplierNames.length !== supplierCurrencies.length) {
    return { ok: false, message: "Supplier rows are incomplete." };
  }
  const allowedSuppliers = new Set(allowedSupplierNames.map(name => name.trim().toUpperCase()));
  const customSupplierDetails: CustomSupplierDetail[] = [];
  const customUsdAmounts: string[] = [];
  const supplierValues: Partial<Record<SupplierKey, string>> = {};
  const selectedSuppliers: string[] = [];

  for (let index = 0; index < supplierNames.length; index++) {
    const supplierName = supplierNames[index];
    const supplierAmount = supplierAmounts[index];
    const name = typeof supplierName === "string" ? supplierName.trim().toUpperCase() : "";
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

    if (!allowedSuppliers.has(name) || name.length > 200) {
      return { ok: false, message: `Unknown supplier: ${name}. Add new suppliers in Settings first.` };
    }
    const column = Object.hasOwn(supplierColumns, name)
      ? supplierColumns[name as keyof typeof supplierColumns] : undefined;
    if (selectedSuppliers.includes(name)) {
      return { ok: false, message: `${name} can only be entered once.` };
    }

    const currency = supplierCurrencies[index];
    if (!isCurrency(currency)) {
      return { ok: false, message: `Choose a valid currency for ${name}.` };
    }
    const usdAmount = convertToUsd(amount, currency, gbpToUsdRate, eurToUsdRate, usdToSgdRate);
    if (usdAmount === null) {
      return { ok: false, message: `Enter a valid amount for ${name} (up to 2 decimal places and within the supported range).` };
    }

    if (column) {
      supplierValues[column] = usdAmount;
      supplierCurrencyDetails.push({ supplier: column, amount, currency });
    } else {
      customSupplierDetails.push({ name, amount, currency });
      customUsdAmounts.push(usdAmount);
    }
    selectedSuppliers.push(name);
  }

  const expenseNames = formData.getAll("expenseName");
  const expenseAmounts = formData.getAll("expenseAmount");
  const expenseCurrencies = formData.getAll("expenseCurrency");
  if (expenseNames.length !== expenseAmounts.length ||
      expenseNames.length !== expenseCurrencies.length) {
    return { ok: false, message: "Expenditure rows are incomplete." };
  }
  const miscellaneousExpenses: MiscellaneousExpense[] = [];
  const expenseNameSet = new Set<string>();
  const usdExpenses: string[] = [];
  for (let index = 0; index < expenseNames.length; index++) {
    const rawName = expenseNames[index];
    const rawAmount = expenseAmounts[index];
    const name = typeof rawName === "string" ? rawName.trim().toUpperCase() : "";
    const amount = typeof rawAmount === "string" ? rawAmount.trim() : "";
    if (!name && !amount) continue;
    if (!name || !amount) {
      return { ok: false, message: "Complete both expenditure name and amount for each row." };
    }
    if (expenseNameSet.has(name)) {
      return { ok: false, message: `${name} can only be entered once.` };
    }
    const currency = expenseCurrencies[index];
    if (!isCurrency(currency)) {
      return { ok: false, message: `Choose a valid currency for ${name}.` };
    }
    const usdAmount = convertToUsd(amount, currency, gbpToUsdRate, eurToUsdRate, usdToSgdRate);
    if (usdAmount === null) {
      return { ok: false, message: `Enter a valid amount for ${name} (up to 2 decimal places and within the supported range).` };
    }
    expenseNameSet.add(name);
    miscellaneousExpenses.push({ name, amount, currency });
    usdExpenses.push(usdAmount);
  }
  const totalMiscellaneousCost = sumUsdAmounts(usdExpenses);
  if (totalMiscellaneousCost === null) {
    return { ok: false, message: "The combined miscellaneous cost exceeds the supported range." };
  }

  const materialTotal = sumUsdAmounts([...Object.values(supplierValues), ...customUsdAmounts]);
  if (materialTotal === null) {
    return { ok: false, message: "The combined material cost exceeds the supported range." };
  }
  const calculationCurrencies = { ...DEFAULT_PANEL_CURRENCIES };
  for (const [key] of panelFields) {
    const currency = formData.get(`panelCurrency-${key}`) ?? "USD";
    if (!isCurrency(currency)) {
      return { ok: false, message: "Choose a valid currency for each calculation-panel value." };
    }
    calculationCurrencies[key] = currency;
  }

  const importedBy = readText(formData, "importedBy");
  if (importedBy && importedBy !== "Felix" && importedBy !== "Customer") {
    return { ok: false, message: "Choose Felix or Customer for Imported By." };
  }

  const values = {
    importedBy: importedBy ? importedBy as "Felix" | "Customer" : null,
    createdBy,
    calculationCurrencies,
    gbpToUsdRate,
    eurToUsdRate,
    usdToSgdRate,
    supplierCurrencyDetails,
    customSupplierDetails,
    paymentMode: readText(formData, "paymentMode") || null,
    clientOrderValue: clientOrderUsdValue,
    clientOrderOriginalValue: clientOrderOriginalValue || null,
    clientOrderCurrency,
    projectName: readText(formData, "projectName") || null,
    projectNotes: readText(formData, "projectNotes") || null,
    orderHandlingFee: orderHandlingFee.value,
    miscellaneousHandlingFee: miscellaneousHandlingFee.value,
    clientName: readText(formData, "clientName") || null,
    endUser: readText(formData, "endUser") || null,
    productSystem: readText(formData, "productSystem") || null,
    orderHandledBy: readText(formData, "orderHandledBy") || null,
    suppliers: selectedSuppliers.length ? selectedSuppliers.join(", ") : null,
    // Clear amounts for suppliers that were removed from the form during editing.
    ...(Object.fromEntries(
      Object.values(supplierColumns).map((column) => [column, null]),
    ) as Record<SupplierKey, null>),
    ...supplierValues,
    misCost: miscellaneousExpenses.length ? totalMiscellaneousCost : null,
    miscellaneousExpenses,
    paymentNotes: readText(formData, "paymentNotes") || null,
  };

  return { ok: true, values };
}

