"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { formatMoney } from "@/lib/format-money";
import Navbar from "@/components/view/navbar/navbar";

import { useRef, useState } from "react";
import { Label as FormLabel } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import { clsx } from "clsx";
import Link from "next/link";
import { createOrder, updateOrder } from "./actions";
import { type Order, type DocumentSummary } from "@/lib/drizzle/schema";
import OrderDocuments, { type DocumentDraft } from "./OrderDocuments";
import { uploadOrderDocument } from "@/lib/document-uploads";
import SupplierDocument from "./SupplierDocument";
import { useRouter } from "next/navigation";
import { canEditOrder } from "@/lib/drizzle/order-access";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_GBP_TO_USD,
  DEFAULT_EUR_TO_USD,
  DEFAULT_USD_TO_SGD,
  convertToUsd,
  convertFromUsd,
  isCurrency,
  restoreSupplierRows,
  type SupplierRow,
  type Currency,
} from "@/lib/drizzle/currency";

import { restoreExpenses, type ExpenseRow } from "@/lib/drizzle/expenses";
import { formatOrderDate, formatOrderEditDate } from "@/lib/drizzle/order-date";
import {
  calculateOrderTotals,
  DEFAULT_PANEL_CURRENCIES,
  panelFields,
} from "@/lib/drizzle/order-calculations";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Override the shared uppercase label style only within this form.
function Label({
  required = false,
  children,
  ...props
}: React.ComponentProps<typeof FormLabel> & { required?: boolean }) {
  return (
    <FormLabel
      {...props}
      className={cn("min-w-0 wrap-break-words", props.className, "normal-case")}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </FormLabel>
  );
}

// Format interface labels without changing stored values or acronyms.
function titleCaseLabel(text: string) {
  const acronyms = new Set([
    "USD",
    "GBP",
    "EUR",
    "SGD",
    "BMS",
    "FDAS",
    "CCTV",
    "LC",
    "TT",
    "EMI",
    "PTE",
  ]);
  return text.replace(/[A-Za-z]+/g, (word) =>
    acronyms.has(word.toUpperCase())
      ? word.toUpperCase()
      : word[0].toUpperCase() + word.slice(1).toLowerCase(),
  );
}

const systemTypes = [
  "BMS",
  "FDAS",
  "CCTV",
  "ACCESS CONTROL",
  "HOME AUTOMATION",
];
const orderHandlers = ["EMI Engineering PTE", "Taxilla Impex PTE"];
// SETTINGS sheet: G = 5%, H = 2%. Inputs store percentages, not fractions.
const DEFAULT_ORDER_HANDLING_FEE = "5.00";
const DEFAULT_MISCELLANEOUS_HANDLING_FEE = "2.00";

const inputStyling = clsx("rounded-lg p-2");
const headingStyling = clsx("font-bold text-1.5xl whitespace-normal");

// Shared by all panel actions, including the Back link.
const actionButtonStyling =
  "rounded-lg normal-case bg-white text-primary hover:bg-border";

// Native radio controls keep keyboard navigation while avoiding text-input sizing.
function PaymentModeField({
  value,
  isOther,
  readOnly = false,
  disabled = false,
  onChoiceChange,
  onOtherChange,
}: {
  value: string;
  isOther: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  onChoiceChange?: (choice: string) => void;
  onOtherChange?: (value: string) => void;
}) {
  const selectedChoice = isOther ? "Other" : value;
  return (
    <fieldset className="min-w-0 space-y-3" disabled={disabled}>
      <legend className={cn(headingStyling, "mb-3")}>Payment Mode</legend>
      {!readOnly && <input type="hidden" name="paymentMode" value={value} />}
      <div className="grid grid-cols-[5rem_5rem_minmax(0,1fr)] gap-3">
        {["LC", "TT", "Other"].map((choice) => {
          const selected = selectedChoice === choice;
          const Option = readOnly ? "div" : "label";
          return (
            <div
              key={choice}
              className={cn(
                "flex min-w-0 flex-wrap items-center gap-3",
                choice === "Other" && "col-span-full @2xl:col-span-1",
              )}
            >
              <Option
                className={cn(
                  "flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  choice !== "Other" && "w-full",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                  !readOnly &&
                    "cursor-pointer hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30",
                  disabled && "cursor-wait opacity-60",
                )}
              >
                {readOnly ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-lg border",
                      selected ? "border-primary" : "border-border",
                    )}
                  >
                    {selected && (
                      <span className="size-2 rounded-lg bg-primary" />
                    )}
                  </span>
                ) : (
                  <input
                    id={"paymentMode" + choice}
                    type="radio"
                    name="paymentModeChoice"
                    value={choice}
                    checked={selected}
                    onChange={() => onChoiceChange?.(choice)}
                    className="size-4 shrink-0 accent-primary"
                  />
                )}
                <span>{choice}</span>
                {readOnly && selected && (
                  <span className="sr-only">Selected</span>
                )}
              </Option>
              {choice === "Other" &&
                isOther &&
                (readOnly ? (
                  <div className="grid min-w-0 basis-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 @sm:basis-0 @sm:flex-1">
                    <Label className="shrink-0 whitespace-nowrap">
                      Payment Method
                    </Label>
                    <Label className="min-h-10 wrap-break-words rounded-lg border bg-muted/50 p-2 text-sm font-semibold text-foreground">
                      {value || "Not specified"}
                    </Label>
                  </div>
                ) : (
                  <div className="grid min-w-0 basis-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 @sm:basis-0 @sm:flex-1">
                    <Label
                      className="shrink-0 whitespace-nowrap"
                      htmlFor="paymentModeDetails"
                    >
                      Payment Method
                    </Label>
                    <Input
                      id="paymentModeDetails"
                      className={cn(inputStyling, "h-10 w-full")}
                      placeholder="Specify payment method"
                      value={value}
                      onChange={(event) => onOtherChange?.(event.target.value)}
                    />
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const EMPTY_DOCUMENTS: DocumentSummary[] = [];

export default function PageBody({
  orderDetails,
  isAdmin,
  username,
  currentDate,
  supplierSuggestions,
  customerSuggestions,
  expenseSuggestions,
  initialDocuments = EMPTY_DOCUMENTS,
}: {
  orderDetails?: Order;
  isAdmin: string;
  username: string;
  currentDate: string;
  supplierSuggestions: string[];
  customerSuggestions: string[];
  expenseSuggestions: string[];
  initialDocuments?: DocumentSummary[];
}) {
  const router = useRouter();
  const [supplierDocuments, setSupplierDocuments] = useState(
    () => initialDocuments,
  );
  const [loadedDocuments, setLoadedDocuments] = useState(initialDocuments);
  if (initialDocuments !== loadedDocuments) {
    setLoadedDocuments(initialDocuments);
    setSupplierDocuments(initialDocuments);
  }
  const [documentBusy, setDocumentBusy] = useState(false);
  const documentBusyRef = useRef(false);
  function setDocumentBusyState(busy: boolean) {
    documentBusyRef.current = busy;
    setDocumentBusy(busy);
  }
  const [pendingSupplierFiles, setPendingSupplierFiles] = useState<
    Record<string, File[]>
  >({});
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([
    { id: 0, file: null },
  ]);
  const [createdOrderId, setCreatedOrderId] = useState<number>();
  function stageSupplierFiles(key: string, selected: File[]) {
    setPendingSupplierFiles((files) => {
      const next = { ...files };
      if (selected.length) next[key] = selected;
      else delete next[key];
      return next;
    });
  }
  // Existing orders retain their recorded date; new orders display today's date.
  const [createdDate, setCreatedDate] = useState<string | null>(
    orderDetails ? orderDetails.createdDate : currentDate,
  );
  // Editable field values are kept here until the form is submitted.

  const [felixOrderNo, setFelixOrderNo] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [importedBy, setImportedBy] = useState<"" | "Felix" | "Customer">("");
  const [clientOrderValue, setClientOrderValue] = useState("");
  const [clientOrderCurrency, setClientOrderCurrency] =
    useState<Currency>("USD");
  const [projectName, setProjectName] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [orderHandlingFee, setOrderHandlingFee] = useState(
    DEFAULT_ORDER_HANDLING_FEE,
  );
  const [miscellaneousHandlingFee, setMiscellaneousHandlingFee] = useState(
    DEFAULT_MISCELLANEOUS_HANDLING_FEE,
  );
  const [clientName, setClientName] = useState("");
  const [endUser, setEndUser] = useState("");
  const [productSystem, setProductSystem] = useState("");
  const [systemTypeChoice, setSystemTypeChoice] = useState("");
  const [orderHandledBy, setOrderHandledBy] = useState("");
  const [orderHandlerChoice, setOrderHandlerChoice] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    { id: 1, name: "", amount: "", currency: "USD" },
  ]);
  const nextExpenseId = useRef(2);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submissionMessage, setSubmissionMessage] = useTransientMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref blocks a second submit immediately, before React renders disabled buttons.
  const submissionInProgress = useRef(false);
  const [panelCurrencies, setPanelCurrencies] = useState({
    ...DEFAULT_PANEL_CURRENCIES,
  });

  const [paymentModeOther, setPaymentModeOther] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([
    { id: 1, supplier: "", amount: "", currency: "USD" },
  ]);
  const [gbpToUsdRate, setGbpToUsdRate] = useState(DEFAULT_GBP_TO_USD);
  const [eurToUsdRate, setEurToUsdRate] = useState(DEFAULT_EUR_TO_USD);
  const [usdToSgdRate, setUsdToSgdRate] = useState(DEFAULT_USD_TO_SGD);
  // Saved supplier rows use IDs 1–31; newly added rows start after those.
  const nextSupplierId = useRef(32);
  const [loadedOrderDetails, setLoadedOrderDetails] = useState<Order>();

  // The role and per-order flag decide whether editing controls are available.
  const canEdit = canEditOrder(
    isAdmin,
    orderDetails?.orderManagerAccess ?? true,
  );
  const [editingRequested, setIsEditing] = useState(!orderDetails);
  const isEditing = canEdit && editingRequested;

  const normalizeNumber = (value: string) => {
    const text = value.trim();
    return text && Number.isFinite(Number(text)) ? String(Number(text)) : text;
  };
  // Compare submitted information, excluding UI choices and temporary row IDs.
  const formSnapshot = JSON.stringify({
    felixOrderNo: felixOrderNo.trim(),
    paymentMode: paymentMode.trim(),
    referenceNumber: referenceNumber.trim(),
    importedBy,
    clientOrderValue: normalizeNumber(clientOrderValue),
    clientOrderCurrency,
    projectName: projectName.trim(),
    projectNotes: projectNotes.trim(),
    orderHandlingFee: normalizeNumber(orderHandlingFee),
    miscellaneousHandlingFee: normalizeNumber(miscellaneousHandlingFee),
    clientName: clientName.trim(),
    endUser: endUser.trim(),
    productSystem: productSystem.trim(),
    orderHandledBy: orderHandledBy.trim(),
    expenses: expenses
      .filter((row) => row.name.trim() || row.amount.trim())
      .map((row) => ({
        name: row.name.trim().toUpperCase(),
        amount: normalizeNumber(row.amount),
        currency: row.currency,
      })),
    paymentNotes: paymentNotes.trim(),
    panelCurrencies,
    suppliers: suppliers
      .filter((row) => row.supplier.trim() || row.amount.trim())
      .map((row) => ({
        supplier: row.supplier.trim().toUpperCase(),
        amount: normalizeNumber(row.amount),
        currency: row.currency,
      })),
    gbpToUsdRate: normalizeNumber(gbpToUsdRate),
    eurToUsdRate: normalizeNumber(eurToUsdRate),
    usdToSgdRate: normalizeNumber(usdToSgdRate),
  });
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string | null>(
    null,
  );
  if (
    savedFormSnapshot === null &&
    (!orderDetails || orderDetails === loadedOrderDetails)
  ) {
    setSavedFormSnapshot(formSnapshot);
  }
  const hasChanges =
    (savedFormSnapshot !== null && formSnapshot !== savedFormSnapshot) ||
    Object.values(pendingSupplierFiles).some((files) => files.length > 0) ||
    documentDrafts.some((draft) => draft.file !== null);

  // Only load a new order once. Without this guard, the setters cause a render loop.
  if (orderDetails && orderDetails !== loadedOrderDetails) {
    setSavedFormSnapshot(null);
    setLoadedOrderDetails(orderDetails);
    setCreatedDate(orderDetails.createdDate);
    setPanelCurrencies({
      ...DEFAULT_PANEL_CURRENCIES,
      ...orderDetails.calculationCurrencies,
    });
    setFelixOrderNo(orderDetails.felixOrderRef);
    // Database nulls become empty strings so the inputs can display them.
    setPaymentMode(orderDetails.paymentMode ?? "");
    setImportedBy(orderDetails.importedBy ?? "");
    setReferenceNumber(orderDetails.referenceNumber ?? "");
    setClientOrderValue(
      orderDetails.clientOrderOriginalValue ??
        orderDetails.clientOrderValue ??
        "",
    );
    setClientOrderCurrency(orderDetails.clientOrderCurrency ?? "USD");
    setProjectName(orderDetails.projectName ?? "");
    setProjectNotes(orderDetails.projectNotes ?? "");
    setOrderHandlingFee(
      orderDetails.orderHandlingFee ?? DEFAULT_ORDER_HANDLING_FEE,
    );
    setMiscellaneousHandlingFee(
      orderDetails.miscellaneousHandlingFee ??
        DEFAULT_MISCELLANEOUS_HANDLING_FEE,
    );
    setClientName(orderDetails.clientName ?? "");
    setEndUser(orderDetails.endUser ?? "");
    const savedSystem = orderDetails.productSystem ?? "";
    const knownSystem = systemTypes.includes(savedSystem.toUpperCase());
    setProductSystem(knownSystem ? savedSystem.toUpperCase() : savedSystem);
    setSystemTypeChoice(
      savedSystem ? (knownSystem ? savedSystem.toUpperCase() : "OTHER") : "",
    );
    const savedHandler = orderDetails.orderHandledBy ?? "";
    const knownHandler = orderHandlers.includes(savedHandler.toUpperCase());
    setOrderHandledBy(knownHandler ? savedHandler.toUpperCase() : savedHandler);
    setOrderHandlerChoice(
      savedHandler
        ? knownHandler
          ? savedHandler.toUpperCase()
          : "OTHERS"
        : "",
    );
    const savedExpenses = restoreExpenses(orderDetails);
    // Negative IDs for restored rows cannot collide with newly added positive IDs.
    setExpenses(
      savedExpenses.length
        ? savedExpenses.map((expense, index) => ({
            ...expense,
            id: -(index + 1),
          }))
        : [{ id: 1, name: "", amount: "", currency: "USD" }],
    );
    setPaymentNotes(orderDetails.paymentNotes ?? "");
    setPaymentModeOther(
      orderDetails.paymentMode &&
        orderDetails.paymentMode !== "LC" &&
        orderDetails.paymentMode !== "TT"
        ? "Other"
        : "",
    );

    // Restore original amounts/currencies; old orders contain USD amounts only.
    const savedSuppliers = restoreSupplierRows(orderDetails);
    setSuppliers(
      savedSuppliers.length
        ? savedSuppliers
        : [{ id: 1, supplier: "", amount: "", currency: "USD" }],
    );
    setGbpToUsdRate(orderDetails.gbpToUsdRate ?? DEFAULT_GBP_TO_USD);
    setEurToUsdRate(orderDetails.eurToUsdRate ?? DEFAULT_EUR_TO_USD);
    setUsdToSgdRate(orderDetails.usdToSgdRate ?? DEFAULT_USD_TO_SGD);

    setIsEditing(false);
  }

  // Derived values recalculate whenever an input changes; no duplicate total state.
  const totals = calculateOrderTotals({
    projectValue: clientOrderValue,
    projectCurrency: clientOrderCurrency,
    suppliers,
    expenses,
    gbpToUsdRate,
    eurToUsdRate,
    usdToSgdRate,
    orderHandlingFee,
    miscellaneousHandlingFee,
  });

  // Empty rows remain available while editing, but are omitted from the read-only view.
  const visibleSuppliers = suppliers.filter(
    (row) => row.supplier.trim() !== "" || row.amount.trim() !== "",
  );
  const visibleExpenses = expenses.filter(
    (row) => row.name.trim() !== "" || row.amount.trim() !== "",
  );

  const showSupplierUsd = visibleSuppliers.some(
    (row) => row.currency !== "USD",
  );
  const showExpenseUsd = visibleExpenses.some((row) => row.currency !== "USD");

  // The page switches between editable fields and a read-only order summary.
  return (
    <div className={manrope.className}>
      <Navbar />
      <div className="flex flex-col gap-4 px-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
        {(orderDetails?.projectName?.trim() ||
          orderDetails?.clientName?.trim()) && (
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            {orderDetails?.projectName?.trim() && (
              <Label className="text-2xl">{orderDetails.projectName}</Label>
            )}
            {orderDetails?.projectName?.trim() &&
              orderDetails?.clientName?.trim() && (
                <Label className="text-4xl font-thin">|</Label>
              )}
            {orderDetails?.clientName?.trim() && (
              <Label className="text-2xl">{orderDetails.clientName}</Label>
            )}
          </div>
        )}
        <div className="shrink-0">
          <Label className="text-2xl whitespace-nowrap">
            {orderDetails?.felixOrderRef}
          </Label>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0 flex flex-col gap-4">
            {isEditing ? (
              <div className="@container min-w-0 w-full rounded-lg border bg-card p-5 sm:p-6">
                <form
                  id="order-form"
                  onSubmit={async (e) => {
                    e.preventDefault();

                    if (
                      !hasChanges ||
                      submissionInProgress.current ||
                      documentBusyRef.current
                    )
                      return;
                    submissionInProgress.current = true;
                    setIsSubmitting(true);
                    setSubmissionMessage("");
                    // The server action validates these fields and recomputes saved USD values.
                    const formData = new FormData(e.currentTarget);
                    try {
                      if (
                        suppliers.some(
                          (row) =>
                            pendingSupplierFiles[row.rowKey ?? `new:${row.id}`]
                              ?.length &&
                            (!row.supplier.trim() || !row.amount.trim()),
                        )
                      ) {
                        setSubmissionMessage(
                          "Complete the supplier and amount for each selected supplier document.",
                        );
                        return;
                      }
                      const existingId = orderDetails?.sl ?? createdOrderId;
                      const result = existingId
                        ? await updateOrder(existingId, formData)
                        : await createOrder(formData);
                      setSubmissionMessage(result.message);
                      if (!result.ok) return;
                      const savedId =
                        existingId ??
                        ("orderId" in result &&
                        typeof result.orderId === "number"
                          ? result.orderId
                          : undefined);
                      if (!savedId)
                        throw new Error(
                          "The saved order reference is missing.",
                        );
                      // Retain the new ID even if an upload fails, so retry updates this order.
                      if (!orderDetails) setCreatedOrderId(savedId);
                      if (
                        "createdDate" in result &&
                        typeof result.createdDate === "string"
                      )
                        setCreatedDate(result.createdDate);
                      const failures: string[] = [];
                      const activeKeys = new Set(
                        suppliers
                          .filter(
                            (row) => row.supplier.trim() && row.amount.trim(),
                          )
                          .map((row) => row.rowKey ?? `new:${row.id}`),
                      );
                      for (const [key, files] of Object.entries(
                        pendingSupplierFiles,
                      )) {
                        if (!activeKeys.has(key)) continue;
                        for (const file of files) {
                          try {
                            const document = await uploadOrderDocument(
                              savedId,
                              file,
                              key,
                            );
                            setSupplierDocuments((documents) => [
                              ...documents,
                              document,
                            ]);
                            setPendingSupplierFiles((pending) => {
                              const remaining = (pending[key] ?? []).filter(
                                (candidate) => candidate !== file,
                              );
                              const next = { ...pending };
                              if (remaining.length) next[key] = remaining;
                              else delete next[key];
                              return next;
                            });
                          } catch (error) {
                            failures.push(
                              `${file.name}: ${error instanceof Error ? error.message : "Upload failed."}`,
                            );
                          }
                        }
                      }
                      for (const draft of documentDrafts) {
                        if (!draft.file) continue;
                        try {
                          const document = await uploadOrderDocument(
                            savedId,
                            draft.file,
                          );
                          setSupplierDocuments((documents) => [
                            ...documents,
                            document,
                          ]);
                          setDocumentDrafts((rows) =>
                            rows.filter((row) => row.id !== draft.id),
                          );
                        } catch (error) {
                          failures.push(
                            `${draft.file.name}: ${error instanceof Error ? error.message : "Upload failed."}`,
                          );
                        }
                      }
                      if (failures.length) {
                        setSubmissionMessage(
                          `${result.message}. Order saved, but some documents failed to upload. Submit again to retry. ${failures.join(" ")}`,
                        );
                        return;
                      }
                      setPendingSupplierFiles({});
                      setIsEditing(false);
                      if (orderDetails) router.refresh();
                      else router.push(`/order_form/${savedId}`);
                    } catch {
                      setSubmissionMessage(
                        "Could not save the order. Please try again.",
                      );
                    } finally {
                      submissionInProgress.current = false;
                      setIsSubmitting(false);
                    }
                  }}
                  className="flex flex-col gap-8"
                >
                  <div className="grid grid-cols-1 items-start gap-6 @sm:grid-cols-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.5fr)]">
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label
                        className={headingStyling}
                        htmlFor="orderHandlerChoice"
                      >
                        Order Handled By
                      </Label>
                      <div className="flex min-w-0 items-center gap-3">
                        <Select
                          value={orderHandlerChoice}
                          onValueChange={(value) => {
                            if (typeof value !== "string") return;
                            setOrderHandlerChoice(value);
                            setOrderHandledBy(value === "OTHERS" ? "" : value);
                          }}
                        >
                          <SelectTrigger
                            id="orderHandlerChoice"
                            className="shrink-0"
                          >
                            <SelectValue placeholder="Select order handler" />
                          </SelectTrigger>
                          <SelectContent>
                            {orderHandlers.map((handler) => (
                              <SelectItem key={handler} value={handler}>
                                {titleCaseLabel(handler)}
                              </SelectItem>
                            ))}
                            <SelectItem value="OTHERS">Others</SelectItem>
                          </SelectContent>
                        </Select>
                        {orderHandlerChoice === "OTHERS" && (
                          <Input
                            className={cn(inputStyling, "min-w-0 flex-1")}
                            id="otherOrderHandler"
                            aria-label="Other order handler"
                            placeholder="Specify order handler"
                            value={orderHandledBy}
                            onChange={(e) => setOrderHandledBy(e.target.value)}
                          />
                        )}
                      </div>
                      <input
                        type="hidden"
                        name="orderHandledBy"
                        value={orderHandledBy}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label
                        className={headingStyling}
                        htmlFor="referenceNumber"
                      >
                        Reference Number
                      </Label>
                      <Input
                        id="referenceNumber"
                        name="referenceNumber"
                        className={inputStyling}
                        value={referenceNumber}
                        placeholder="Reference number"
                        disabled={isSubmitting || documentBusy}
                        onChange={(event) =>
                          setReferenceNumber(event.target.value)
                        }
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label className={headingStyling} htmlFor="importedBy">
                        Import By
                      </Label>
                      <Select
                        value={importedBy}
                        onValueChange={(value) => {
                          if (value === "Felix" || value === "Customer")
                            setImportedBy(value);
                        }}
                      >
                        <SelectTrigger
                          id="importedBy"
                          className="w-full"
                          disabled={isSubmitting || documentBusy}
                        >
                          <SelectValue placeholder="Select importer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Felix">Felix</SelectItem>
                          <SelectItem value="Customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <input
                        type="hidden"
                        name="importedBy"
                        value={importedBy}
                      />
                    </div>
                  </div>
                  {/* Project information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 border rounded-lg p-4 @xl:grid-cols-2">
                      <h2 className="col-span-full text-[1.21em] font-extrabold underline underline-offset-4">
                        Project Information
                      </h2>
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <Label
                          htmlFor="systemTypeChoice"
                          className={headingStyling}
                        >
                          System Type
                        </Label>
                        <div className="flex min-w-0 flex-col gap-3">
                          <Select
                            value={systemTypeChoice}
                            onValueChange={(value) => {
                              if (typeof value !== "string") return;
                              setSystemTypeChoice(value);
                              setProductSystem(value === "OTHER" ? "" : value);
                            }}
                          >
                            <SelectTrigger
                              id="systemTypeChoice"
                              className="w-full"
                            >
                              <SelectValue placeholder="Select system type" />
                            </SelectTrigger>
                            <SelectContent>
                              {systemTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {titleCaseLabel(type)}
                                </SelectItem>
                              ))}
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {systemTypeChoice === "OTHER" && (
                            <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                              <Label
                                className={headingStyling}
                                htmlFor="otherSystemType"
                              >
                                Other System Type
                              </Label>
                              <Input
                                className={inputStyling}
                                id="otherSystemType"
                                placeholder="Specify system type"
                                value={productSystem}
                                onChange={(e) =>
                                  setProductSystem(e.target.value)
                                }
                              />
                            </div>
                          )}
                        </div>
                        {/* Submit either the selected preset or the custom Other text. */}
                        <input
                          type="hidden"
                          name="productSystem"
                          value={productSystem}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <Label
                          className={headingStyling}
                          required
                          htmlFor="projectName"
                        >
                          Project Name
                        </Label>
                        <Input
                          id="projectName"
                          name="projectName"
                          required
                          type="text"
                          value={projectName}
                          className={inputStyling}
                          onChange={(e) => setProjectName(e.target.value)}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <Label
                          className={headingStyling}
                          required
                          htmlFor="clientName"
                        >
                          Customer Name
                        </Label>
                        <Input
                          className={inputStyling}
                          id="clientName"
                          name="clientName"
                          required
                          list="customer-options"
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                        />
                        <datalist id="customer-options">
                          {customerSuggestions.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <Label className={headingStyling} htmlFor="endUser">
                          End User
                        </Label>
                        <Input
                          className={inputStyling}
                          id="endUser"
                          name="endUser"
                          type="text"
                          value={endUser}
                          onChange={(e) => setEndUser(e.target.value)}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 @xl:col-span-2 [&>label:first-child]:min-h-6">
                        <Label
                          className={headingStyling}
                          htmlFor="projectNotes"
                        >
                          Project Notes
                        </Label>
                        <textarea
                          className={cn(inputStyling, "border")}
                          id="projectNotes"
                          name="projectNotes"
                          value={projectNotes}
                          onChange={(e) => setProjectNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Order value, payment and costs */}
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-3 border rounded-lg p-4">
                        <h2 className="col-span-full text-[1.21em] font-extrabold underline underline-offset-4">
                          Payment Information
                        </h2>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 items-end gap-4 @xl:grid-cols-[minmax(0,1fr)_8rem]">
                            <div className="flex min-w-0 flex-col gap-2 [&>label]:min-h-6">
                              <Label
                                className={headingStyling}
                                htmlFor="clientOrderValue"
                              >
                                Client Order Value
                              </Label>
                              <MoneyInput
                                className={inputStyling}
                                id="clientOrderValue"
                                name="clientOrderValue"
                                value={clientOrderValue}
                                onValueChange={(value) =>
                                  setClientOrderValue(value)
                                }
                              />
                            </div>
                            <div className="flex min-w-0 flex-col gap-2 [&>label]:min-h-6 [&_[data-slot=select-trigger]]:w-full">
                              <Label
                                className={headingStyling}
                                htmlFor="clientOrderCurrency"
                              >
                                Currency
                              </Label>
                              <Select
                                value={clientOrderCurrency}
                                onValueChange={(currency) => {
                                  if (isCurrency(currency))
                                    setClientOrderCurrency(currency);
                                }}
                              >
                                <SelectTrigger id="clientOrderCurrency">
                                  <SelectValue>
                                    {clientOrderCurrency === "EUR"
                                      ? "Euro"
                                      : clientOrderCurrency}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">Euro</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SGD">SGD</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              type="hidden"
                              name="clientOrderCurrency"
                              value={clientOrderCurrency}
                            />
                            {clientOrderCurrency !== "USD" && (
                              <div className="min-w-0 @xl:col-span-2">
                                <div className="flex min-w-0 flex-wrap items-center gap-3">
                                  <Label
                                    className={headingStyling}
                                    htmlFor="clientOrderUsdValue"
                                  >
                                    Order Value (USD)
                                  </Label>
                                  <Input
                                    className={inputStyling}
                                    id="clientOrderUsdValue"
                                    value={formatMoney(
                                      convertToUsd(
                                        clientOrderValue,
                                        clientOrderCurrency,
                                        gbpToUsdRate,
                                        eurToUsdRate,
                                        usdToSgdRate,
                                      ),
                                      "",
                                    )}
                                    placeholder="Enter an amount and valid rate"
                                    readOnly
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <PaymentModeField
                          value={paymentMode}
                          isOther={paymentModeOther === "Other"}
                          disabled={isSubmitting || documentBusy}
                          onChoiceChange={(choice) => {
                            if (choice === "Other") {
                              if (paymentModeOther !== "Other")
                                setPaymentMode("");
                              setPaymentModeOther("Other");
                            } else {
                              setPaymentMode(choice);
                              setPaymentModeOther("");
                            }
                          }}
                          onOtherChange={setPaymentMode}
                        />
                        <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                          <Label
                            className={headingStyling}
                            htmlFor="paymentNotes"
                          >
                            Payment Notes
                          </Label>
                          <textarea
                            className={cn(inputStyling, "border")}
                            id="paymentNotes"
                            name="paymentNotes"
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Supplier names use inputs, with suggestions for the brands in the schema. */}
                    <div className="space-y-4">
                      <datalist id="supplier-options">
                        {supplierSuggestions.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>

                      <h3 className="text-[1.21em] font-extrabold underline underline-offset-4">
                        Material Cost
                      </h3>
                      <div className="flex flex-col gap-4 border px-4 py-2 rounded-lg">
                        {suppliers.map((row, index) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 py-2 @2xl:grid-cols-[1.5rem_calc((100%_-_9rem)*5/11)_minmax(5.5rem,0.65fr)_minmax(5.5rem,0.55fr)_auto_3.5rem]"
                          >
                            <Label className="mt-8 h-10 self-start justify-center text-base font-semibold tracking-normal tabular-nums">
                              {index + 1}.
                            </Label>
                            <div className="-ml-2 col-start-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6 @2xl:col-start-auto">
                              <Label
                                className={headingStyling}
                                htmlFor={`supplier-${row.id}`}
                              >
                                Supplier
                              </Label>
                              <Input
                                className={inputStyling}
                                id={`supplier-${row.id}`}
                                name="supplier"
                                placeholder="Supplier"
                                aria-label={`Supplier ${index + 1}`}
                                list="supplier-options"
                                value={row.supplier}
                                onChange={(e) => {
                                  // Update only this row's supplier name.
                                  setSuppliers((rows) =>
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, supplier: e.target.value }
                                        : item,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="col-start-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6 @2xl:col-start-auto">
                              <Label
                                className={headingStyling}
                                htmlFor={`supplier-amount-${row.id}`}
                              >
                                Amount
                              </Label>
                              <MoneyInput
                                className={inputStyling}
                                id={`supplier-amount-${row.id}`}
                                name="supplierAmount"
                                value={row.amount}
                                placeholder={`in ${row.currency}`}
                                onValueChange={(value) => {
                                  // Update only this row's amount; keep it as a string so it can be cleared.
                                  setSuppliers((rows) =>
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, amount: value }
                                        : item,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="col-start-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6 @2xl:col-start-auto [&_[data-slot=select-trigger]]:w-full">
                              <Label
                                className={headingStyling}
                                htmlFor={`supplier-currency-${row.id}`}
                              >
                                Currency
                              </Label>
                              <Select
                                value={row.currency}
                                onValueChange={(currency) => {
                                  if (!isCurrency(currency)) return;
                                  setSuppliers((rows) =>
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, currency }
                                        : item,
                                    ),
                                  );
                                }}
                              >
                                <SelectTrigger
                                  id={`supplier-currency-${row.id}`}
                                >
                                  <SelectValue>
                                    {row.currency === "EUR"
                                      ? "Euro"
                                      : row.currency}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">Euro</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SGD">SGD</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-start-2 min-w-0 @2xl:col-start-auto @2xl:pt-8">
                              <SupplierDocument
                                orderId={orderDetails?.sl ?? createdOrderId}
                                pendingFiles={
                                  pendingSupplierFiles[
                                    row.rowKey ?? `new:${row.id}`
                                  ] ?? []
                                }
                                onFilesChange={(files) =>
                                  stageSupplierFiles(
                                    row.rowKey ?? `new:${row.id}`,
                                    files,
                                  )
                                }
                                documents={supplierDocuments.filter(
                                  (document) =>
                                    document.supplierRowKey ===
                                    (row.rowKey ?? `new:${row.id}`),
                                )}
                                editable
                                disabled={isSubmitting || documentBusy}
                                onBusyChange={setDocumentBusyState}
                                onRemoved={(id) =>
                                  setSupplierDocuments((documents) =>
                                    documents.filter(
                                      (document) => document.id !== id,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <input
                              type="hidden"
                              name="supplierRowKey"
                              value={row.rowKey ?? `new:${row.id}`}
                            />
                            <input
                              type="hidden"
                              name="supplierCurrency"
                              value={row.currency}
                            />
                            <div className="col-start-3 row-start-1 self-start pt-8 @2xl:col-start-6 @2xl:[&>button]:w-full">
                              <Button
                                type="button"
                                aria-label={`Remove supplier ${index + 1}`}
                                disabled={isSubmitting || documentBusy}
                                onClick={() =>
                                  setSuppliers((rows) =>
                                    rows.filter((item) => item.id !== row.id),
                                  )
                                }
                              >
                                <span className="text-xl leading-none">−</span>
                              </Button>
                            </div>
                            {row.currency !== "USD" && (
                              <div className="col-start-2 min-w-0 @2xl:col-start-2 @2xl:col-span-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-3">
                                  <Label
                                    className={headingStyling}
                                    htmlFor={`supplier-usd-${row.id}`}
                                  >
                                    Amount (USD)
                                  </Label>
                                  <Label
                                    id={`supplier-usd-${row.id}`}
                                    className="px-2"
                                  >
                                    {formatMoney(
                                      convertToUsd(
                                        row.amount,
                                        row.currency,
                                        gbpToUsdRate,
                                        eurToUsdRate,
                                        usdToSgdRate,
                                      ),
                                      "",
                                    )}
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        aria-label="Add supplier"
                        onClick={() => {
                          // Append a new empty row with an ID that has not been used before.
                          const id = Math.max(
                            nextSupplierId.current,
                            ...suppliers.map((row) => row.id + 1),
                          );
                          nextSupplierId.current = id + 1;
                          setSuppliers((rows) => [
                            ...rows,
                            {
                              id,
                              rowKey: crypto.randomUUID(),
                              supplier: "",
                              amount: "",
                              currency: "USD",
                            },
                          ]);
                        }}
                      >
                        <span className="text-xl leading-none">+</span>
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <datalist id="expense-options">
                        {expenseSuggestions.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                      <h3 className="text-[1.21em] font-extrabold underline underline-offset-4">
                        Miscellaneous Costs
                      </h3>
                      <div className="flex flex-col gap-4 border px-4 py-2 rounded-lg">
                        {expenses.map((row, index) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 py-2 @2xl:grid-cols-[1.5rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_3.5rem]"
                          >
                            <Label className="h-10 self-end justify-center text-base font-semibold tracking-normal tabular-nums">
                              {index + 1}.
                            </Label>
                            <div className="-ml-2 col-start-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6 @2xl:col-start-auto">
                              <Label
                                className={headingStyling}
                                htmlFor={`expense-${row.id}`}
                              >
                                Expenditure
                              </Label>
                              <Input
                                className={inputStyling}
                                id={`expense-${row.id}`}
                                name="expenseName"
                                placeholder="Expenditure name"
                                aria-label={`Expenditure name ${index + 1}`}
                                list="expense-options"
                                value={row.name}
                                onChange={(e) => {
                                  // Update only this row's expenditure name.
                                  setExpenses((rows) =>
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, name: e.target.value }
                                        : item,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="col-start-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6 @2xl:col-start-auto">
                              <Label
                                className={headingStyling}
                                htmlFor={`expense-amount-${row.id}`}
                              >
                                Amount
                              </Label>
                              <MoneyInput
                                className={inputStyling}
                                id={`expense-amount-${row.id}`}
                                name="expenseAmount"
                                value={row.amount}
                                placeholder={`in ${row.currency}`}
                                onValueChange={(value) => {
                                  // Update only this row's amount; keep it as a string so it can be cleared.
                                  setExpenses((rows) =>
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, amount: value }
                                        : item,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="col-start-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6 @2xl:col-start-auto **:data-[slot=select-trigger]:w-full">
                              <Label
                                className={headingStyling}
                                htmlFor={`expense-currency-${row.id}`}
                              >
                                Currency
                              </Label>
                              <Select
                                value={row.currency}
                                onValueChange={(currency) => {
                                  if (!isCurrency(currency)) return;
                                  setExpenses((rows) =>
                                    rows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, currency }
                                        : item,
                                    ),
                                  );
                                }}
                              >
                                <SelectTrigger
                                  id={`expense-currency-${row.id}`}
                                >
                                  <SelectValue>
                                    {row.currency === "EUR"
                                      ? "Euro"
                                      : row.currency}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">Euro</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SGD">SGD</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <input
                              type="hidden"
                              name="expenseCurrency"
                              value={row.currency}
                            />
                            <div className="col-start-3 row-start-1 self-end @2xl:col-start-5 @2xl:[&>button]:w-full">
                              <Button
                                type="button"
                                aria-label={`Remove expenditure ${index + 1}`}
                                onClick={() =>
                                  setExpenses((rows) =>
                                    rows.filter((item) => item.id !== row.id),
                                  )
                                }
                              >
                                <span className="text-xl leading-none">−</span>
                              </Button>
                            </div>
                            {row.currency !== "USD" && (
                              <div className="col-start-2 min-w-0 @2xl:col-start-2 @2xl:col-span-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-3">
                                  <Label
                                    className={headingStyling}
                                    htmlFor={`expense-usd-${row.id}`}
                                  >
                                    Amount (USD)
                                  </Label>
                                  <Label id={`expense-usd-${row.id}`}>
                                    {formatMoney(
                                      convertToUsd(
                                        row.amount,
                                        row.currency,
                                        gbpToUsdRate,
                                        eurToUsdRate,
                                        usdToSgdRate,
                                      ),
                                      "",
                                    )}
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        aria-label="Add expenditure"
                        onClick={() => {
                          // Append a new empty row with an ID that has not been used before.
                          const id = nextExpenseId.current++;
                          setExpenses((rows) => [
                            ...rows,
                            { id, name: "", amount: "", currency: "USD" },
                          ]);
                        }}
                      >
                        <span className="text-xl leading-none">+</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="@container min-w-0 w-full rounded-lg border bg-card p-5 sm:p-6">
                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 items-start gap-6 @sm:grid-cols-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.5fr)]">
                    {orderHandledBy.trim() !== "" && (
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                          <strong className="block">Order Handled By</strong>
                          {orderHandledBy}
                        </p>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col gap-2 @sm:col-start-2">
                      <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                        <strong className="block">Reference Number</strong>
                        {referenceNumber || "Not specified"}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 @sm:col-start-2 @lg:col-start-3">
                      <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                        <strong className="block">Import By</strong>
                        {importedBy || "Not selected"}
                      </p>
                    </div>
                  </div>
                  {/* Project information */}
                  {[
                    productSystem,
                    projectName,
                    clientName,
                    endUser,
                    projectNotes,
                  ].some((value) => value.trim() !== "") && (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 border rounded-lg p-4 @xl:grid-cols-2">
                        <h2 className="col-span-full text-[1.21em] font-extrabold underline underline-offset-4">
                          Project Information
                        </h2>
                        {productSystem.trim() !== "" && (
                          <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                            <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                              <strong>System Type:</strong> {productSystem}
                            </p>
                          </div>
                        )}

                        {projectName.trim() !== "" && (
                          <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                            <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                              <strong>Project Name:</strong> {projectName}
                            </p>
                          </div>
                        )}
                        {clientName.trim() !== "" && (
                          <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                            <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                              <strong>Customer:</strong> {clientName}
                            </p>
                          </div>
                        )}
                        {endUser.trim() !== "" && (
                          <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                            <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                              <strong>End User:</strong> {endUser}
                            </p>
                          </div>
                        )}
                        {projectNotes.trim() !== "" && (
                          <div className="flex min-w-0 flex-col gap-2 @xl:col-span-2 [&>label:first-child]:min-h-6">
                            <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                              <strong>Project Notes:</strong>
                              <br />
                              {projectNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Order value, payment and costs */}
                  {(clientOrderValue.trim() !== "" ||
                    paymentMode.trim() !== "" ||
                    paymentNotes.trim() !== "" ||
                    visibleSuppliers.length > 0 ||
                    visibleExpenses.length > 0) && (
                    <div className="flex flex-col gap-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-3 border rounded-lg p-4">
                          <h2 className="col-span-full text-[1.21em] font-extrabold underline underline-offset-4">
                            Payment Information
                          </h2>
                          {clientOrderValue.trim() !== "" && (
                            <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                              <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                                <strong>
                                  Client Order Value ({clientOrderCurrency}):
                                </strong>{" "}
                                {formatMoney(clientOrderValue)}
                              </p>
                              {clientOrderCurrency !== "USD" && (
                                <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                                  <p className="min-w-0 whitespace-pre-wrap wrap-break-words">
                                    <strong>Order Value (USD):</strong>{" "}
                                    {formatMoney(
                                      convertToUsd(
                                        clientOrderValue,
                                        clientOrderCurrency,
                                        gbpToUsdRate,
                                        eurToUsdRate,
                                        usdToSgdRate,
                                      ),
                                      "—",
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          {paymentMode.trim() !== "" && (
                            <PaymentModeField
                              value={paymentMode}
                              isOther={paymentModeOther === "Other"}
                              readOnly
                            />
                          )}
                          {paymentNotes.trim() !== "" && (
                            <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                              <Label className={headingStyling}>
                                Payment Notes
                              </Label>
                              <p className="min-w-0 whitespace-pre-wrap wrap-break-words font-bold">
                                {paymentNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {visibleSuppliers.length > 0 && (
                        <section
                          className="min-w-0 space-y-4"
                          aria-labelledby="material-cost-heading"
                        >
                          <h3
                            id="material-cost-heading"
                            className="text-[1.21em] font-extrabold underline underline-offset-4"
                          >
                            Material Cost
                          </h3>
                          <div
                            role="region"
                            aria-label="Material cost table"
                            tabIndex={0}
                            className="overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <table className="w-full min-w-[36rem] text-center text-sm">
                              <thead className="border-b bg-muted/50">
                                <tr>
                                  <th
                                    scope="col"
                                    aria-label="Row number"
                                    className="w-12 px-4 py-3"
                                  >
                                    &nbsp;
                                  </th>
                                  <th scope="col" className="w-full px-4 py-3">
                                    Supplier
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-px whitespace-nowrap px-4 py-3 text-center"
                                  >
                                    Amount
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-px whitespace-nowrap px-4 py-3 text-center"
                                  >
                                    Currency
                                  </th>
                                  {showSupplierUsd && (
                                    <th
                                      scope="col"
                                      className="w-px whitespace-nowrap px-4 py-3 text-center"
                                    >
                                      Amount (USD)
                                    </th>
                                  )}
                                  <th
                                    scope="col"
                                    className="w-px whitespace-nowrap px-4 py-3 text-center"
                                  >
                                    Documents
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {visibleSuppliers.map((row, index) => {
                                  return (
                                    <tr key={row.id} className="align-middle">
                                      <td className="w-12 px-3 py-3 text-center text-base font-semibold tracking-normal tabular-nums">
                                        {index + 1}.
                                      </td>
                                      <th
                                        scope="row"
                                        className="max-w-64 wrap-break-words px-4 py-3 text-center font-semibold"
                                      >
                                        {row.supplier}
                                      </th>
                                      <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums">
                                        {formatMoney(row.amount)}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3 text-center">
                                        {row.currency === "EUR"
                                          ? "Euro"
                                          : row.currency}
                                      </td>
                                      {showSupplierUsd && (
                                        <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums">
                                          {formatMoney(
                                            convertToUsd(
                                              row.amount,
                                              row.currency,
                                              gbpToUsdRate,
                                              eurToUsdRate,
                                              usdToSgdRate,
                                            ),
                                            "—",
                                          )}
                                        </td>
                                      )}
                                      <td className="whitespace-nowrap px-4 py-3 text-center">
                                        <SupplierDocument
                                          orderId={
                                            orderDetails?.sl ?? createdOrderId
                                          }
                                          documents={supplierDocuments.filter(
                                            (document) =>
                                              document.supplierRowKey ===
                                              (row.rowKey ?? `new:${row.id}`),
                                          )}
                                          editable={false}
                                          disabled={false}
                                          onBusyChange={setDocumentBusyState}
                                          onRemoved={() => {}}
                                          onFilesChange={() => {}}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                      {visibleExpenses.length > 0 && (
                        <section
                          className="min-w-0 space-y-4"
                          aria-labelledby="miscellaneous-cost-heading"
                        >
                          <h3
                            id="miscellaneous-cost-heading"
                            className="text-[1.21em] font-extrabold underline underline-offset-4"
                          >
                            Miscellaneous Costs
                          </h3>
                          <div
                            role="region"
                            aria-label="Miscellaneous costs table"
                            tabIndex={0}
                            className="overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <table className="w-full min-w-[28rem] text-center text-sm">
                              <thead className="border-b bg-muted/50">
                                <tr>
                                  <th
                                    scope="col"
                                    aria-label="Row number"
                                    className="w-12 px-4 py-3"
                                  >
                                    &nbsp;
                                  </th>
                                  <th scope="col" className="w-full px-4 py-3">
                                    Expenditure
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-px whitespace-nowrap px-4 py-3 text-center"
                                  >
                                    Amount
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-px whitespace-nowrap px-4 py-3 text-center"
                                  >
                                    Currency
                                  </th>
                                  {showExpenseUsd && (
                                    <th
                                      scope="col"
                                      className="w-px whitespace-nowrap px-4 py-3 text-center"
                                    >
                                      Amount (USD)
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {visibleExpenses.map((row, index) => (
                                  <tr key={row.id} className="align-middle">
                                    <td className="w-12 px-3 py-3 text-center text-base font-semibold tracking-normal tabular-nums">
                                      {index + 1}.
                                    </td>
                                    <th
                                      scope="row"
                                      className="max-w-64 wrap-break-words px-4 py-3 text-center font-semibold"
                                    >
                                      {row.name}
                                    </th>
                                    <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums">
                                      {formatMoney(row.amount)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-center">
                                      {row.currency === "EUR"
                                        ? "Euro"
                                        : row.currency}
                                    </td>
                                    {showExpenseUsd && (
                                      <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums">
                                        {formatMoney(
                                          convertToUsd(
                                            row.amount,
                                            row.currency,
                                            gbpToUsdRate,
                                            eurToUsdRate,
                                            usdToSgdRate,
                                          ),
                                          "—",
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* File selections are staged here and uploaded by the form submit handler. */}
            <OrderDocuments
              key={orderDetails?.sl ?? "new"}
              orderId={orderDetails?.sl ?? createdOrderId}
              initialDocuments={supplierDocuments.filter(
                (document) => document.supplierRowKey === null,
              )}
              drafts={documentDrafts}
              setDrafts={setDocumentDrafts}
              onBusyChange={setDocumentBusyState}
              onUploadedDocumentRemoved={(id) =>
                setSupplierDocuments((rows) =>
                  rows.filter((row) => row.id !== id),
                )
              }
              editable={isEditing}
              disabled={isSubmitting || documentBusy}
            />
          </div>
          <div className="min-w-0 flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6">
              <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 [&>label:last-child]:justify-end [&>label:last-child]:text-right">
                <Label className={headingStyling}>Created By:</Label>
                <Label className="font-bold">
                  {orderDetails?.createdBy ?? username}
                </Label>
              </div>
              <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
                <Label className={headingStyling}>Last Edited By:</Label>
                <Label className="justify-end text-right font-bold whitespace-nowrap">
                  {orderDetails?.lastEditedBy ?? "Not edited yet"}
                </Label>
              </div>
              <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
                <Label className={headingStyling}>Last Edited At:</Label>
                <Label className="justify-end text-right font-bold whitespace-nowrap">
                  {orderDetails?.lastEditedAt
                    ? formatOrderEditDate(orderDetails.lastEditedAt)
                    : "Not edited yet"}
                </Label>
              </div>
              {felixOrderNo && (
                <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 [&>label:last-child]:justify-end [&>label:last-child]:text-right">
                  <Label className={headingStyling}>
                    Purchase Order Number:
                  </Label>
                  <Label className="font-bold">{felixOrderNo}</Label>
                </div>
              )}
              {createdDate && (
                <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 [&>label:last-child]:justify-end [&>label:last-child]:text-right">
                  <Label className={headingStyling}>Date Created:</Label>
                  <Label className="font-bold">
                    {formatOrderDate(createdDate)}
                  </Label>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6">
              {panelFields.map(([key, label]) => {
                const amount = totals[key];
                const displayed =
                  amount === null
                    ? null
                    : convertFromUsd(
                        amount,
                        panelCurrencies[key],
                        gbpToUsdRate,
                        eurToUsdRate,
                        usdToSgdRate,
                      );
                if (!isEditing && displayed === null) return null;
                return (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                  >
                    <Label
                      className={headingStyling}
                      htmlFor={`panel-currency-${key}`}
                    >
                      {titleCaseLabel(label)}:
                    </Label>
                    <div className="flex items-center gap-4">
                      <Label className="font-bold" aria-live="polite">
                        {formatMoney(displayed, "—")}
                      </Label>
                      <Select
                        disabled={isSubmitting || documentBusy}
                        value={panelCurrencies[key]}
                        onValueChange={(currency) => {
                          if (isCurrency(currency)) {
                            setPanelCurrencies((values) => ({
                              ...values,
                              [key]: currency,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger
                          id={`panel-currency-${key}`}
                          aria-label={`${label} currency`}
                        >
                          <SelectValue>
                            {panelCurrencies[key] === "EUR"
                              ? "Euro"
                              : panelCurrencies[key]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">Euro</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="SGD">SGD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isEditing && (
                      // The panel sits outside the form, so associate its hidden fields explicitly.
                      <input
                        type="hidden"
                        form="order-form"
                        name={`panelCurrency-${key}`}
                        value={panelCurrencies[key]}
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                {isEditing ? (
                  <>
                    <Button
                      key="submit-order"
                      type="submit"
                      disabled={!hasChanges || isSubmitting || documentBusy}
                      form="order-form"
                      className={cn(
                        actionButtonStyling,
                        "disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100",
                      )}
                    >
                      {isSubmitting ? "Saving…" : "Submit"}
                    </Button>
                    <Button
                      type="button"
                      className={actionButtonStyling}
                      key="discard-order"
                      disabled={isSubmitting || documentBusy}
                      onClick={() => {
                        setSubmissionMessage("");
                        setPendingSupplierFiles({});
                        setDocumentDrafts([{ id: 0, file: null }]);
                        if (createdOrderId && !orderDetails) {
                          router.push(`/order_form/${createdOrderId}`);
                          return;
                        }
                        // Restore saved fields and currencies before leaving edit mode.
                        if (orderDetails) setLoadedOrderDetails(undefined);
                        setIsEditing(false);
                      }}
                    >
                      Discard Changes
                    </Button>
                  </>
                ) : (
                  <>
                    {canEdit && (
                      <Button
                        type="button"
                        className={actionButtonStyling}
                        key="edit-order"
                        onClick={(event) => {
                          event.preventDefault();
                          setSubmissionMessage("");
                          setGbpToUsdRate(Number(gbpToUsdRate).toFixed(2));
                          setEurToUsdRate(Number(eurToUsdRate).toFixed(2));
                          setUsdToSgdRate(Number(usdToSgdRate).toFixed(2));
                          if (orderHandlingFee !== "")
                            setOrderHandlingFee(
                              Number(orderHandlingFee).toFixed(2),
                            );
                          if (miscellaneousHandlingFee !== "")
                            setMiscellaneousHandlingFee(
                              Number(miscellaneousHandlingFee).toFixed(2),
                            );
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    <Link
                      href="/home"
                      className={cn(buttonVariants(), actionButtonStyling)}
                    >
                      Back
                    </Link>
                  </>
                )}
              </div>
            </div>

            <section
              aria-labelledby="order-settings-heading"
              className="@container flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6"
            >
              <h2
                id="order-settings-heading"
                className={cn(headingStyling, "text-lg")}
              >
                Settings
              </h2>
              {/* Explicit form ownership keeps these sidebar fields in the order submission. */}
              {isEditing ? (
                <div className="flex flex-col gap-6">
                  {/* Rates are saved with this order and shared by all its supplier rows. */}
                  <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                      <Label className={headingStyling} htmlFor="gbpToUsdRate">
                        GBP To USD
                      </Label>
                      <Input
                        form="order-form"
                        disabled={isSubmitting || documentBusy}
                        className={cn(
                          inputStyling,
                          "bg-white text-foreground border-white/30",
                        )}
                        id="gbpToUsdRate"
                        name="gbpToUsdRate"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={gbpToUsdRate}
                        onChange={(e) => {
                          if (/^\d*(?:\.\d{0,2})?$/.test(e.target.value)) {
                            setGbpToUsdRate(e.target.value);
                          }
                        }}
                        onBlur={() => {
                          if (gbpToUsdRate !== "" && Number(gbpToUsdRate) > 0) {
                            setGbpToUsdRate(Number(gbpToUsdRate).toFixed(2));
                          }
                        }}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                      <Label className={headingStyling} htmlFor="eurToUsdRate">
                        Euro To USD
                      </Label>
                      <Input
                        form="order-form"
                        disabled={isSubmitting || documentBusy}
                        className={cn(
                          inputStyling,
                          "bg-white text-foreground border-white/30",
                        )}
                        id="eurToUsdRate"
                        name="eurToUsdRate"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={eurToUsdRate}
                        onChange={(e) => {
                          if (/^\d*(?:\.\d{0,2})?$/.test(e.target.value)) {
                            setEurToUsdRate(e.target.value);
                          }
                        }}
                        onBlur={() => {
                          if (eurToUsdRate !== "" && Number(eurToUsdRate) > 0) {
                            setEurToUsdRate(Number(eurToUsdRate).toFixed(2));
                          }
                        }}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                      <Label className={headingStyling} htmlFor="usdToSgdRate">
                        USD To SGD
                      </Label>
                      <Input
                        form="order-form"
                        disabled={isSubmitting || documentBusy}
                        className={cn(
                          inputStyling,
                          "bg-white text-foreground border-white/30",
                        )}
                        id="usdToSgdRate"
                        name="usdToSgdRate"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={usdToSgdRate}
                        onChange={(e) => {
                          if (/^\d*(?:\.\d{0,2})?$/.test(e.target.value)) {
                            setUsdToSgdRate(e.target.value);
                          }
                        }}
                        onBlur={() => {
                          if (usdToSgdRate !== "" && Number(usdToSgdRate) > 0) {
                            setUsdToSgdRate(Number(usdToSgdRate).toFixed(2));
                          }
                        }}
                      />
                    </div>
                  </div>
                  {/* Percentage settings are stored on this order; 5 means 5%. */}
                  <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                      <Label
                        className={headingStyling}
                        htmlFor="orderHandlingFee"
                      >
                        Order Handling Fee (%)
                      </Label>
                      <Input
                        form="order-form"
                        disabled={isSubmitting || documentBusy}
                        className={cn(
                          inputStyling,
                          "bg-white text-foreground border-white/30",
                        )}
                        id="orderHandlingFee"
                        name="orderHandlingFee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={orderHandlingFee}
                        onChange={(e) => {
                          if (/^\d*(?:\.\d{0,2})?$/.test(e.target.value)) {
                            setOrderHandlingFee(e.target.value);
                          }
                        }}
                        onBlur={() => {
                          if (orderHandlingFee !== "")
                            setOrderHandlingFee(
                              Number(orderHandlingFee).toFixed(2),
                            );
                        }}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                      <Label
                        className={headingStyling}
                        htmlFor="miscellaneousHandlingFee"
                      >
                        Miscellaneous Handling Fee (%)
                      </Label>
                      <Input
                        form="order-form"
                        disabled={isSubmitting || documentBusy}
                        className={cn(
                          inputStyling,
                          "bg-white text-foreground border-white/30",
                        )}
                        id="miscellaneousHandlingFee"
                        name="miscellaneousHandlingFee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={miscellaneousHandlingFee}
                        onChange={(e) => {
                          if (/^\d*(?:\.\d{0,2})?$/.test(e.target.value)) {
                            setMiscellaneousHandlingFee(e.target.value);
                          }
                        }}
                        onBlur={() => {
                          if (miscellaneousHandlingFee !== "")
                            setMiscellaneousHandlingFee(
                              Number(miscellaneousHandlingFee).toFixed(2),
                            );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {(orderDetails?.gbpToUsdRate ||
                    orderDetails?.eurToUsdRate ||
                    orderDetails?.usdToSgdRate) && (
                    <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
                      {orderDetails?.gbpToUsdRate && (
                        <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                          <Label className={headingStyling}>GBP To USD</Label>
                          <Label className="font-bold">
                            {Number(orderDetails.gbpToUsdRate).toFixed(2)}
                          </Label>
                        </div>
                      )}
                      {orderDetails?.eurToUsdRate && (
                        <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                          <Label className={headingStyling}>Euro To USD</Label>
                          <Label className="font-bold">
                            {Number(orderDetails.eurToUsdRate).toFixed(2)}
                          </Label>
                        </div>
                      )}
                      {orderDetails?.usdToSgdRate && (
                        <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                          <Label className={headingStyling}>USD To SGD</Label>
                          <Label className="font-bold">
                            {Number(orderDetails.usdToSgdRate).toFixed(2)}
                          </Label>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
                    {orderHandlingFee.trim() !== "" && (
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <Label className={headingStyling}>
                          Order Handling Fee (%)
                        </Label>
                        <Label className="font-bold">
                          {Number(orderHandlingFee).toFixed(2)}
                        </Label>
                      </div>
                    )}
                    {miscellaneousHandlingFee.trim() !== "" && (
                      <div className="flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6">
                        <Label className={headingStyling}>
                          Miscellaneous Handling Fee (%)
                        </Label>
                        <Label className="font-bold">
                          {Number(miscellaneousHandlingFee).toFixed(2)}
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {submissionMessage && (
              <p role="status" className="mt-3 text-black">
                {submissionMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
