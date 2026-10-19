import { convertToUsd, supplierColumns, type CustomSupplierDetail } from "./currency";

type SupplierOrder = {
  customSupplierDetails?: CustomSupplierDetail[] | null;
  gbpToUsdRate?: string | null;
  eurToUsdRate?: string | null;
  usdToSgdRate?: string | null;
};

// Include unused catalog entries immediately and retain historical names.
export function customSupplierColumns(orders: SupplierOrder[], suggestions: string[]) {
  return [...new Set([
    ...suggestions,
    ...orders.flatMap(order => (order.customSupplierDetails ?? []).map(detail => detail.name)),
  ].map(name => name.trim().toUpperCase()))]
    .filter(name => name && !Object.hasOwn(supplierColumns, name))
    .sort((a, b) => a.localeCompare(b));
}

export function customSupplierUsdByName(order: SupplierOrder) {
  return new Map((order.customSupplierDetails ?? []).map(detail => [
    detail.name.trim().toUpperCase(),
    convertToUsd(detail.amount, detail.currency, order.gbpToUsdRate ?? "",
      order.eurToUsdRate ?? "", order.usdToSgdRate ?? undefined),
  ]));
}
