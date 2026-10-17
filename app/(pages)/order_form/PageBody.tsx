"use client";

import { useRef, useState } from "react";
import { Label as FormLabel } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sora, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createOrder, updateOrder } from "./actions";
import { type Order } from "@/lib/drizzle/schema";
import { LogOut } from "lucide-react";

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
  convertToUsd,
  convertFromUsd,
  isCurrency,
  restoreSupplierRows,
  type SupplierRow,
  type Currency,
} from "@/lib/drizzle/currency";

import { restoreExpenses, type ExpenseRow } from "@/lib/drizzle/expenses";
import { formatOrderDate } from "@/lib/drizzle/order-date";
import {
  calculateOrderTotals,
  DEFAULT_PANEL_CURRENCIES,
  panelFields,
} from "@/lib/drizzle/order-calculations";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Override the shared uppercase label style only within this form.
function Label(props: React.ComponentProps<typeof FormLabel>) {
  return (
    <FormLabel {...props} className={cn(props.className, "normal-case")} />
  );
}

// Format interface labels without changing stored values or acronyms.
function titleCaseLabel(text: string) {
  const acronyms = new Set([
    "USD",
    "GBP",
    "EUR",
    "BMS",
    "FDAS",
    "CCTV",
    "LC",
    "TT",
    "EMI",
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
const orderHandlers = ["EMI ENGINEERING", "TAXILA IMPEX"];
// SETTINGS sheet: G = 5%, H = 2%. Inputs store percentages, not fractions.
const DEFAULT_ORDER_HANDLING_FEE = "5";
const DEFAULT_MISCELLANEOUS_HANDLING_FEE = "2";

// Shared by all panel actions, including the Back link.
const actionButtonStyling =
  "rounded normal-case bg-white text-primary hover:bg-border";

export default function PageBody({
  orderDetails,
  isAdmin,
  username,
  currentDate,
}: {
  orderDetails?: Order;
  isAdmin: boolean;
  username: string;
  currentDate: string;
}) {
  // Existing orders retain their recorded date; new orders display today's date.
  const [createdDate, setCreatedDate] = useState<string | null>(
    orderDetails ? orderDetails.createdDate : currentDate,
  );
  // States

  const [felixOrderNo, setFelixOrderNo] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
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
  const [submissionMessage, setSubmissionMessage] = useState("");
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
  // Saved supplier rows use IDs 1–31; newly added rows start after those.
  const nextSupplierId = useRef(32);
  const [loadedOrderDetails, setLoadedOrderDetails] = useState<Order>();

  const [isEditing, setIsEditing] = useState(!orderDetails);

  // Only load a new order once. Without this guard, the setters cause a render loop.
  if (orderDetails && orderDetails !== loadedOrderDetails) {
    setLoadedOrderDetails(orderDetails);
    setCreatedDate(orderDetails.createdDate);
    setPanelCurrencies({
      ...DEFAULT_PANEL_CURRENCIES,
      ...orderDetails.calculationCurrencies,
    });
    setFelixOrderNo(orderDetails.felixOrderRef);
    // Database nulls become empty strings so the inputs can display them.
    setPaymentMode(orderDetails.paymentMode ?? "");
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
    orderHandlingFee,
    miscellaneousHandlingFee,
  });

  return (
    <div className={manrope.className}>
      <nav className="w-full bg-white border-b border-gray-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm h-[68px]">
        <div className="flex items-center h-full">
          {/* Logo */}
          <Link
            href="/home"
            className="flex items-center gap-3 cursor-pointer mr-12 lg:mr-16"
          >
            <svg
              className="h-10 w-auto"
              viewBox="56 18 416 334"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M63 24H182V56H133V86H177V117H133V200H63Z"
                stroke="#186636"
                strokeWidth="4"
              />
              <path
                d="M145 127H220V141H190V155H215V168H190V185H224V199H145Z M239 127H284V185H316V199H239Z"
                fill="#000000"
              />
              <path
                d="M302 127H359C361 160 348 194 330 219H302Z"
                fill="#186636"
                stroke="#000000"
                strokeWidth="4"
              />
              <circle cx="331" cy="93" r="28" fill="#F80304" />
              <path
                d="M371 129L402 178L443 141L466 171L418 203L454 257L402 214L212 345L383 196L359 177Z"
                fill="#000000"
                stroke="#F80304"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col border-l border-gray-200 pl-3 py-0.5 justify-center">
              <span
                className={`text-[15px] font-extrabold leading-none text-gray-900 mb-1 ${sora.className}`}
              >
                Felix Controls Limited
              </span>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wide leading-none">
                Order Workspace
              </span>
            </div>
          </Link>
          {/* Navbar animations */}
          <div className="hidden md:flex items-center h-full gap-8 text-[15px] font-medium text-gray-600">
            <Link
              href="/home"
              className="relative h-full flex items-center hover:text-primary transition-colors group"
            >
              Home
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>

            <Link
              href="/summary"
              className="relative h-full flex items-center hover:text-primary transition-colors group"
            >
              Summary
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>
          </div>
        </div>
        {/* User */}
        <div className="flex items-center gap-5">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors text-[15px] font-medium"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div>
        <div className="grid grid-cols-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {isEditing ? (
            <div className="min-w-0 w-full overflow-x-auto p-4 border rounded ">
              <form
                id="order-form"
                onSubmit={async (e) => {
                  e.preventDefault();

                  if (submissionInProgress.current) return;
                  submissionInProgress.current = true;
                  setIsSubmitting(true);
                  setSubmissionMessage("");
                  const formData = new FormData(e.currentTarget);
                  try {
                    if (orderDetails) {
                      const result = await updateOrder(
                        orderDetails.sl,
                        formData,
                      );
                      setSubmissionMessage(result.message);
                      // Validation failures must leave the user's edits on screen.
                      if (result.ok) setIsEditing(false);
                    } else {
                      const result = await createOrder(formData);
                      if (result.ok && result.createdDate)
                        setCreatedDate(result.createdDate);
                      setSubmissionMessage(result.message);
                    }
                  } catch {
                    setSubmissionMessage(
                      "Could not save the order. Please try again.",
                    );
                  } finally {
                    submissionInProgress.current = false;
                    setIsSubmitting(false);
                  }
                }}
                className="p-4 flex flex-col gap-10 "
              >
                <div className="">
                  <Label htmlFor="orderHandlerChoice">Order Handled By</Label>
                  <div className="flex flex-col gap-3">
                    <Select
                      value={orderHandlerChoice}
                      onValueChange={(value) => {
                        if (typeof value !== "string") return;
                        setOrderHandlerChoice(value);
                        setOrderHandledBy(value === "OTHERS" ? "" : value);
                      }}
                    >
                      <SelectTrigger id="orderHandlerChoice">
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
                      <div className="flex">
                        <Label htmlFor="otherOrderHandler">
                          Other Order Handler
                        </Label>
                        <Input
                          id="otherOrderHandler"
                          placeholder="Specify order handler"
                          value={orderHandledBy}
                          onChange={(e) => setOrderHandledBy(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="hidden"
                    name="orderHandledBy"
                    value={orderHandledBy}
                  />
                </div>
                {/* Project information */}
                <div>
                  <Label className="text-2xl">Project Information</Label>
                  <div className="flex flex-col gap-10">
                    <div>
                      <Label htmlFor="systemTypeChoice" className="font-bold">
                        System Type
                      </Label>
                      <div className="flex gap-3">
                        <Select
                          value={systemTypeChoice}
                          onValueChange={(value) => {
                            if (typeof value !== "string") return;
                            setSystemTypeChoice(value);
                            setProductSystem(value === "OTHER" ? "" : value);
                          }}
                        >
                          <SelectTrigger id="systemTypeChoice">
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
                          <div>
                            <Label htmlFor="otherSystemType">
                              Other System Type
                            </Label>
                            <Input
                              id="otherSystemType"
                              placeholder="Specify system type"
                              value={productSystem}
                              onChange={(e) => setProductSystem(e.target.value)}
                              required
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
                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        name="projectName"
                        type="text"
                        value={projectName}
                        className="rounded"
                        onChange={(e) => setProjectName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientName">Customer</Label>
                      <Input
                        id="clientName"
                        name="clientName"
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endUser">End User</Label>
                      <Input
                        id="endUser"
                        name="endUser"
                        type="text"
                        value={endUser}
                        onChange={(e) => setEndUser(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectNotes">Project Notes</Label>
                      <Textarea
                        id="projectNotes"
                        name="projectNotes"
                        value={projectNotes}
                        onChange={(e) => setProjectNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {/* Order value, payment and costs */}
                <div className="flex flex-col gap-10">
                  <div>
                    <Label htmlFor="clientOrderValue">Client Order Value</Label>
                    <div className="flex gap-3">
                      <Input
                        id="clientOrderValue"
                        name="clientOrderValue"
                        type="number"
                        min="0"
                        step="0.01"
                        value={clientOrderValue}
                        onChange={(e) => setClientOrderValue(e.target.value)}
                      />
                      <Label htmlFor="clientOrderCurrency">Currency</Label>
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
                        </SelectContent>
                      </Select>
                      <Input
                        type="hidden"
                        name="clientOrderCurrency"
                        value={clientOrderCurrency}
                      />
                      {clientOrderCurrency !== "USD" && (
                        <div className="flex">
                          <Label htmlFor="clientOrderUsdValue">
                            Order Value (USD)
                          </Label>
                          <Input
                            id="clientOrderUsdValue"
                            value={
                              convertToUsd(
                                clientOrderValue,
                                clientOrderCurrency,
                                gbpToUsdRate,
                                eurToUsdRate,
                              ) ?? ""
                            }
                            placeholder="Enter an amount and valid rate"
                            readOnly
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <input
                      type="hidden"
                      name="paymentMode"
                      value={paymentMode}
                    />
                    <Label className="font-bold">Payment Mode</Label>
                    <div className="flex justify-between">
                      <Label htmlFor="paymentModeLC">LC</Label>
                      <Input
                        id="paymentModeLC"
                        name="paymentModeChoice"
                        type="radio"
                        value="LC"
                        checked={
                          paymentMode === "LC" && paymentModeOther !== "Other"
                        }
                        onChange={() => {
                          setPaymentMode("LC");

                          setPaymentModeOther("");
                        }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <Label htmlFor="paymentModeTT">TT</Label>
                      <Input
                        id="paymentModeTT"
                        name="paymentModeChoice"
                        type="radio"
                        value="TT"
                        checked={
                          paymentMode === "TT" && paymentModeOther !== "Other"
                        }
                        onChange={() => {
                          setPaymentMode("TT");
                          setPaymentModeOther("");
                        }}
                      />
                    </div>
                    <div className="flex flex-col justify-between">
                      <Label htmlFor="paymentModeOther">Other</Label>
                      <Input
                        id="paymentModeOther"
                        name="paymentModeChoice"
                        type="radio"
                        value="Other"
                        checked={paymentModeOther === "Other"}
                        onChange={() => {
                          setPaymentModeOther("Other");
                          setPaymentMode("");
                        }}
                      />
                      {paymentModeOther === "Other" && (
                        <Input
                          value={paymentMode}
                          onChange={(e) => {
                            setPaymentMode(e.target.value);
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="paymentNotes">Payment Notes</Label>
                    <Input
                      id="paymentNotes"
                      name="paymentNotes"
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
                  {/* Supplier names use inputs, with suggestions for the brands in the schema. */}
                  <div>
                    <datalist id="supplier-options">
                      <option value="TRANE" />
                      <option value="BELIMO" />
                      <option value="DANFOSS" />
                      <option value="HONEYWELL" />
                      <option value="REGELTECHNIK" />
                      <option value="DWYER" />
                      <option value="ALPS" />
                      <option value="CONTROL 4" />
                      <option value="LUTRON" />
                      <option value="LANDIS+GYR" />
                      <option value="RBH" />
                      <option value="PROSTAR" />
                      <option value="GISSMATIC" />
                      <option value="ZKTECO" />
                      <option value="ADTESHIA" />
                      <option value="FIKE" />
                      <option value="TECOFI" />
                      <option value="SEWO" />
                      <option value="EBELCO" />
                      <option value="DOOYA" />
                      <option value="POGO" />
                      <option value="PARK HELP" />
                      <option value="FOSHAN" />
                      <option value="KELE" />
                      <option value="MULTICABLE" />
                      <option value="DEYZ" />
                      <option value="SIEMENS" />
                      <option value="FLASH TURTLE" />
                      <option value="SERVO" />
                      <option value="HABOO" />
                      <option value="OTHERS" />
                    </datalist>

                    <Label className="font-bold">Material Cost</Label>
                    {suppliers.map((row, index) => (
                      <div key={row.id} className="flex">
                        <Label>{index + 1}.</Label>
                        <Input
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
                        <Label htmlFor={`supplier-amount-${row.id}`}>
                          Amount
                        </Label>
                        <Input
                          id={`supplier-amount-${row.id}`}
                          name="supplierAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          placeholder={`in ${row.currency}`}
                          onChange={(e) => {
                            // Update only this row's amount; keep it as a string so it can be cleared.
                            setSuppliers((rows) =>
                              rows.map((item) =>
                                item.id === row.id
                                  ? { ...item, amount: e.target.value }
                                  : item,
                              ),
                            );
                          }}
                        />
                        <Label htmlFor={`supplier-currency-${row.id}`}>
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
                          <SelectTrigger id={`supplier-currency-${row.id}`}>
                            <SelectValue>
                              {row.currency === "EUR" ? "Euro" : row.currency}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">Euro</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* A hidden field keeps the currency paired with its FormData row. */}
                        <input
                          type="hidden"
                          name="supplierCurrency"
                          value={row.currency}
                        />
                        {row.currency !== "USD" && (
                          <div className="flex">
                            <Label htmlFor={`supplier-usd-${row.id}`}>
                              Amount (USD)
                            </Label>
                            <Label
                              id={`supplier-usd-${row.id}`}
                              className="px-2"
                            >
                              {convertToUsd(
                                row.amount,
                                row.currency,
                                gbpToUsdRate,
                                eurToUsdRate,
                              ) ?? ""}
                            </Label>
                          </div>
                        )}
                        <Button
                          type="button"
                          aria-label={`Remove supplier ${index + 1}`}
                          onClick={() =>
                            setSuppliers((rows) =>
                              rows.filter((item) => item.id !== row.id),
                            )
                          }
                        >
                          −
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      aria-label="Add supplier"
                      onClick={() => {
                        // Append a new empty row with an ID that has not been used before.
                        const id = nextSupplierId.current++;
                        setSuppliers((rows) => [
                          ...rows,
                          { id, supplier: "", amount: "", currency: "USD" },
                        ]);
                      }}
                    >
                      +
                    </Button>
                  </div>
                  <div>
                    <datalist id="expense-options">
                      <option value="FREIGHT: USA TO SINGAPORE" />
                      <option value="FREIGHT: GERMANY TO SINGAPORE" />
                      <option value="FREIGHT: CHINA TO SINGAPORE" />
                      <option value="Bank Fee" />
                      <option value="DHL Cost" />
                      <option value="UPS Cost" />
                    </datalist>
                    <Label className="font-bold">Miscellaneous Costs</Label>
                    {expenses.map((row, index) => (
                      <div key={row.id} className="flex">
                        <Label>{index + 1}.</Label>
                        <Input
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
                        <Label htmlFor={`expense-amount-${row.id}`}>
                          Amount
                        </Label>
                        <Input
                          id={`expense-amount-${row.id}`}
                          name="expenseAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          placeholder={`in ${row.currency}`}
                          onChange={(e) => {
                            // Update only this row's amount; keep it as a string so it can be cleared.
                            setExpenses((rows) =>
                              rows.map((item) =>
                                item.id === row.id
                                  ? { ...item, amount: e.target.value }
                                  : item,
                              ),
                            );
                          }}
                        />
                        <Label htmlFor={`expense-currency-${row.id}`}>
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
                          <SelectTrigger id={`expense-currency-${row.id}`}>
                            <SelectValue>
                              {row.currency === "EUR" ? "Euro" : row.currency}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">Euro</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* A hidden field keeps the currency paired with its FormData row. */}
                        <input
                          type="hidden"
                          name="expenseCurrency"
                          value={row.currency}
                        />
                        {row.currency !== "USD" && (
                          <div className="flex">
                            <Label htmlFor={`expense-usd-${row.id}`}>
                              Amount (USD)
                            </Label>
                            <Label id={`expense-usd-${row.id}`}>
                              {convertToUsd(
                                row.amount,
                                row.currency,
                                gbpToUsdRate,
                                eurToUsdRate,
                              ) ?? ""}
                            </Label>
                          </div>
                        )}
                        <Button
                          type="button"
                          aria-label={`Remove expenditure ${index + 1}`}
                          onClick={() =>
                            setExpenses((rows) =>
                              rows.filter((item) => item.id !== row.id),
                            )
                          }
                        >
                          −
                        </Button>
                      </div>
                    ))}
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
                      +
                    </Button>
                  </div>
                </div>
                {/* Order settings */}
                <div className="flex flex-col gap-10">
                  {/* Rates are saved with this order and shared by all its supplier rows. */}
                  <div className="flex gap-10">
                    <div>
                      <Label htmlFor="gbpToUsdRate">GBP To USD</Label>
                      <Input
                        id="gbpToUsdRate"
                        name="gbpToUsdRate"
                        type="number"
                        min="0.00000001"
                        step="0.00000001"
                        required
                        value={gbpToUsdRate}
                        onChange={(e) => setGbpToUsdRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="eurToUsdRate">Euro To USD</Label>
                      <Input
                        id="eurToUsdRate"
                        name="eurToUsdRate"
                        type="number"
                        min="0.00000001"
                        step="0.00000001"
                        required
                        value={eurToUsdRate}
                        onChange={(e) => setEurToUsdRate(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Percentage settings are stored on this order; 5 means 5%. */}
                  <div className="flex gap-10">
                    <div>
                      <Label htmlFor="orderHandlingFee">
                        Order Handling Fee (%)
                      </Label>
                      <Input
                        id="orderHandlingFee"
                        name="orderHandlingFee"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={orderHandlingFee}
                        onChange={(e) => setOrderHandlingFee(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="miscellaneousHandlingFee">
                        Miscellaneous Handling Fee (%)
                      </Label>
                      <Input
                        id="miscellaneousHandlingFee"
                        name="miscellaneousHandlingFee"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={miscellaneousHandlingFee}
                        onChange={(e) =>
                          setMiscellaneousHandlingFee(e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="min-w-0 w-full overflow-x-auto border rounded p-4">
              <div className="p-4 flex flex-col gap-10">
                <div>
                  <Label>Order Handled By</Label>
                  <Label className="font-bold">{orderHandledBy}</Label>
                </div>
                {/* Project information */}
                <div className="flex flex-col gap-10">
                  <div>
                    <Label className="font-bold">System Type</Label>
                    <Label className="font-bold">{productSystem}</Label>
                  </div>
                  <div>
                    <Label>Project Name</Label>
                    <Label className="font-bold">{projectName}</Label>
                  </div>
                  <div>
                    <Label>Customer</Label>
                    <Label className="font-bold">{clientName}</Label>
                  </div>
                  <div>
                    <Label>End User</Label>
                    <Label className="font-bold">{endUser}</Label>
                  </div>
                  <div>
                    <Label>Project Notes</Label>
                    <Label className="font-bold whitespace-pre-wrap">
                      {projectNotes}
                    </Label>
                  </div>
                </div>
                {/* Order value, payment and costs */}
                <div className="flex flex-col gap-10">
                  <div>
                    <Label>Client Order Value ({clientOrderCurrency})</Label>
                    <Label className="font-bold">{clientOrderValue}</Label>
                    {clientOrderCurrency !== "USD" && (
                      <div>
                        <Label>Order Value (USD)</Label>
                        <Label className="font-bold">
                          {convertToUsd(
                            clientOrderValue,
                            clientOrderCurrency,
                            gbpToUsdRate,
                            eurToUsdRate,
                          ) ?? "—"}
                        </Label>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="font-bold">Payment Mode</Label>

                    <div className="flex justify-between">
                      <Label htmlFor="paymentModeLC">LC</Label>
                      <Input
                        id="paymentModeLC"
                        name="paymentMode"
                        type="radio"
                        value="LC"
                        checked={
                          paymentMode === "LC" && paymentModeOther !== "Other"
                        }
                        disabled
                      />
                    </div>

                    <div className="flex justify-between">
                      <Label htmlFor="paymentModeTT">TT</Label>
                      <Input
                        id="paymentModeTT"
                        name="paymentMode"
                        type="radio"
                        value="TT"
                        checked={
                          paymentMode === "TT" && paymentModeOther !== "Other"
                        }
                        disabled
                      />
                    </div>

                    <div className="flex justify-between">
                      <Label htmlFor="paymentModeOther">Other</Label>
                      <Input
                        id="paymentModeOther"
                        name="paymentMode"
                        type="radio"
                        value="Other"
                        checked={paymentModeOther === "Other"}
                        disabled
                      />

                      {paymentModeOther === "Other" && (
                        <Label className="font-bold">{paymentMode}</Label>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Payment Notes</Label>
                    <Label className="font-bold">{paymentNotes}</Label>
                  </div>
                  <div>
                    <Label className="font-bold">Material Cost</Label>
                    {suppliers.map((row, index) => (
                      <div key={row.id} className="flex gap-10">
                        <Label>{index + 1}.</Label>
                        <div className="flex gap-3">
                          <Label className="font-bold">{row.supplier}</Label>
                        </div>
                        <div className="flex gap-3">
                          <Label>Amount ({row.currency})</Label>
                          <Label className="font-bold">{row.amount}</Label>
                        </div>
                        <div className="flex gap-3">
                          <Label>Currency</Label>
                          <Label className="font-bold">
                            {row.currency === "EUR" ? "Euro" : row.currency}
                          </Label>
                        </div>
                        {row.currency !== "USD" && (
                          <div className="flex gap-3 items-center">
                            <Label>Amount (USD)</Label>
                            <Label className="font-bold">
                              {convertToUsd(
                                row.amount,
                                row.currency,
                                gbpToUsdRate,
                                eurToUsdRate,
                              ) ?? "—"}
                            </Label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label className="font-bold">Miscellaneous Costs</Label>
                    {expenses
                      .filter((row) => row.name || row.amount)
                      .map((row, index) => (
                        <div key={row.id} className="flex gap-10">
                          <Label>{index + 1}.</Label>
                          <Label className="font-bold">{row.name}</Label>
                          <div className="flex gap-3">
                            <Label>Amount ({row.currency})</Label>
                            <Label className="font-bold">{row.amount}</Label>
                          </div>
                          <div className="flex gap-3">
                            <Label>Currency</Label>
                            <Label className="font-bold">
                              {row.currency === "EUR" ? "Euro" : row.currency}
                            </Label>
                          </div>
                          {row.currency !== "USD" && (
                            <div className="flex gap-3">
                              <Label>Amount (USD)</Label>
                              <Label className="font-bold">
                                {convertToUsd(
                                  row.amount,
                                  row.currency,
                                  gbpToUsdRate,
                                  eurToUsdRate,
                                ) ?? "—"}
                              </Label>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
                {/* Order settings */}
                <div className="flex flex-col gap-10">
                  <div className="flex gap-10">
                    <div>
                      <Label>GBP To USD</Label>
                      <Label className="font-bold">
                        {orderDetails?.gbpToUsdRate ?? "Not recorded"}
                      </Label>
                    </div>
                    <div>
                      <Label>Euro To USD</Label>
                      <Label className="font-bold">
                        {orderDetails?.eurToUsdRate ?? "Not recorded"}
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-10">
                    <div>
                      <Label>Order Handling Fee (%)</Label>
                      <Label className="font-bold">{orderHandlingFee}</Label>
                    </div>
                    <div>
                      <Label>Miscellaneous Handling Fee (%)</Label>
                      <Label className="font-bold">
                        {miscellaneousHandlingFee}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="min-w-0 flex flex-col gap-4">
            <div className="flex p-4 text-white flex-col gap-3 rounded bg-primary">
              <div className="flex min-h-10 items-center justify-between gap-10">
                <Label>Created By:</Label>
                <Label className="font-bold">
                  {isEditing ? username : (orderDetails?.createdBy ?? username)}
                </Label>
              </div>
              {felixOrderNo && (
                <div className="flex min-h-10 items-center justify-between gap-10">
                  <Label>Purchase Order Number:</Label>
                  <Label className="font-bold">{felixOrderNo}</Label>
                </div>
              )}
              <div className="flex min-h-10 items-center justify-between gap-10">
                <Label>Date Created:</Label>
                <Label className="font-bold">
                  {formatOrderDate(createdDate)}
                </Label>
              </div>
            </div>
            <div className="flex p-4 text-white flex-col gap-3 rounded bg-primary">
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
                      );
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-10"
                  >
                    <Label htmlFor={`panel-currency-${key}`}>
                      {titleCaseLabel(label)}:
                    </Label>
                    <div className="flex gap-4">
                      <Label className="font-bold" aria-live="polite">
                        {displayed ?? "—"}
                      </Label>
                      <Select
                        disabled={isSubmitting}
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
              <div className="flex flex-wrap gap-3 pt-4">
                {isEditing ? (
                  <>
                    <Button
                      key="submit-order"
                      type="submit"
                      disabled={isSubmitting}
                      form="order-form"
                      className={actionButtonStyling}
                    >
                      {isSubmitting ? "Saving…" : "Submit"}
                    </Button>
                    <Button
                      type="button"
                      className={actionButtonStyling}
                      key="discard-order"
                      disabled={isSubmitting}
                      onClick={() => {
                        setSubmissionMessage("");
                        // Restore saved fields and currencies before leaving edit mode.
                        if (orderDetails) setLoadedOrderDetails(undefined);
                        setIsEditing(false);
                      }}
                    >
                      Discard Changes
                    </Button>
                  </>
                ) : isAdmin ? (
                  <>
                    <Button
                      type="button"
                      className={actionButtonStyling}
                      key="edit-order"
                      onClick={(event) => {
                        event.preventDefault();
                        setSubmissionMessage("");
                        setIsEditing(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Link
                      href="/home"
                      className={cn(buttonVariants(), actionButtonStyling)}
                    >
                      Back
                    </Link>
                  </>
                ) : null}
              </div>
            </div>

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
