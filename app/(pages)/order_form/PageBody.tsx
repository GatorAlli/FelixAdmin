"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
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

// Shared by Edit, Submit and Discard; preserve the current panel button colors.
const actionButtonStyling =
  "rounded bg-white text-[#123c26] hover:bg-[#dfdfdf]";

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
    <div>
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
                FELIX CONTROLS LIMITED
              </span>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase leading-none">
                ORDER WORKSPACE
              </span>
            </div>
          </Link>
          {/* Navbar animations */}
          <div className="hidden md:flex items-center h-full gap-8 text-[15px] font-medium text-gray-600">
            <Link
              href="/home"
              className="relative h-full flex items-center text-[#186636] font-semibold"
            >
              Home
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636]" />
            </Link>

            <Link
              href="/orders"
              className="relative h-full flex items-center hover:text-[#186636] transition-colors group"
            >
              Orders
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>

            <Link
              href="/summary"
              className="relative h-full flex items-center hover:text-[#186636] transition-colors group"
            >
              Summary
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>

            <Link
              href="/about"
              className="relative h-full flex items-center hover:text-[#186636] transition-colors group"
            >
              About Company
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#186636] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            </Link>
          </div>
        </div>
        {/* User */}
        <div className="flex items-center gap-5">
          <div className="w-9 h-9 rounded-full bg-[#E8F0EA] text-[#186636] flex items-center justify-center font-bold text-sm">
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
      <div className="flex justify-between p-4">
        <Label>
          Created by:{" "}
          {isEditing ? username : (orderDetails?.createdBy ?? username)}
        </Label>
        <div>
          {felixOrderNo ? (
            <Label>Purchase Order Number: {felixOrderNo}</Label>
          ) : (
            <div></div>
          )}
        </div>
        <Label>Date Created: {formatOrderDate(createdDate)}</Label>
      </div>
      <div>
        <div className="flex items-start p-4">
          {isEditing ? (
            <div className="p-4 border rounded">
              <form
                id="order-form"
                onSubmit={async (e) => {
                  e.preventDefault();

                  setSubmissionMessage("");
                  if (orderDetails) {
                    const result = await updateOrder(
                      orderDetails.sl,
                      new FormData(e.currentTarget),
                    );
                    setSubmissionMessage(result.message);
                  } else {
                    const result = await createOrder(
                      new FormData(e.currentTarget),
                    );
                    if (result.ok && result.createdDate)
                      setCreatedDate(result.createdDate);
                    setSubmissionMessage(result.message);
                  }
                }}
                className="p-4 flex flex-col gap-10"
              >
                <div className="">
                  <Label htmlFor="orderHandlerChoice">ORDER HANDLED BY</Label>
                  <div className="flex gap-3">
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
                            {handler}
                          </SelectItem>
                        ))}
                        <SelectItem value="OTHERS">OTHERS</SelectItem>
                      </SelectContent>
                    </Select>
                    {orderHandlerChoice === "OTHERS" && (
                      <div className="flex">
                        <Label htmlFor="otherOrderHandler">
                          OTHER ORDER HANDLER
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
                        SYSTEM TYPE
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
                                {type}
                              </SelectItem>
                            ))}
                            <SelectItem value="OTHER">OTHER</SelectItem>
                          </SelectContent>
                        </Select>
                        {systemTypeChoice === "OTHER" && (
                          <div>
                            <Label htmlFor="otherSystemType">
                              OTHER SYSTEM TYPE
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
                      <Label htmlFor="projectName">Project name</Label>
                      <Input
                        id="projectName"
                        name="projectName"
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientName">CUSTOMER</Label>
                      <Input
                        id="clientName"
                        name="clientName"
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endUser">End user</Label>
                      <Input
                        id="endUser"
                        name="endUser"
                        type="text"
                        value={endUser}
                        onChange={(e) => setEndUser(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectNotes">PROJECT NOTES</Label>
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
                    <Label htmlFor="clientOrderValue">CLIENT ORDER VALUE</Label>
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
                      <Label htmlFor="clientOrderCurrency">CURRENCY</Label>
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
                            ORDER VALUE (USD)
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
                    <Label className="font-bold">Payment Mode</Label>
                    <div className="flex justify-between">
                      <Label htmlFor="paymentMode">LC</Label>
                      <Input
                        id="paymentMode"
                        name="paymentMode"
                        type="radio"
                        value={paymentMode}
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
                      <Label htmlFor="paymentMode">TT</Label>
                      <Input
                        id="paymentMode"
                        name="paymentMode"
                        type="radio"
                        value={paymentMode}
                        checked={
                          paymentMode === "TT" && paymentModeOther !== "Other"
                        }
                        onChange={() => {
                          setPaymentMode("TT");
                          setPaymentModeOther("");
                        }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <Label htmlFor="paymentMode">Other</Label>
                      <Input
                        id="paymentMode"
                        name="paymentMode"
                        type="radio"
                        value={paymentMode}
                        checked={paymentModeOther === "Other"}
                        onChange={() => {
                          setPaymentModeOther("Other");
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

                    <Label className="font-bold">MATERIAL COST</Label>
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
                          CURRENCY
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
                              AMOUNT (USD)
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
                    <Label className="font-bold">MISCELLANEOUS COSTS</Label>
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
                          CURRENCY
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
                              AMOUNT (USD)
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
                      <Label htmlFor="gbpToUsdRate">GBP TO USD</Label>
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
                      <Label htmlFor="eurToUsdRate">EURO TO USD</Label>
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
                        ORDER HANDLING FEE (%)
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
                        MISCELLANEOUS HANDLING FEE (%)
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
            <div className="border rounded p-4">
              <div className="p-4 flex flex-col gap-10">
                <div>
                  <Label>Order handled by</Label>
                  <Label className="font-bold">{orderHandledBy}</Label>
                </div>
                {/* Project information */}
                <div className="flex flex-col gap-10">
                  <div>
                    <Label className="font-bold">SYSTEM TYPE</Label>
                    <Label className="font-bold">{productSystem}</Label>
                  </div>
                  <div>
                    <Label>Project name</Label>
                    <Label className="font-bold">{projectName}</Label>
                  </div>
                  <div>
                    <Label>CUSTOMER</Label>
                    <Label className="font-bold">{clientName}</Label>
                  </div>
                  <div>
                    <Label>End user</Label>
                    <Label className="font-bold">{endUser}</Label>
                  </div>
                  <div>
                    <Label>PROJECT NOTES</Label>
                    <Label className="font-bold whitespace-pre-wrap">
                      {projectNotes}
                    </Label>
                  </div>
                </div>
                {/* Order value, payment and costs */}
                <div className="flex flex-col gap-10">
                  <div>
                    <Label>CLIENT ORDER VALUE ({clientOrderCurrency})</Label>
                    <Label className="font-bold">{clientOrderValue}</Label>
                    {clientOrderCurrency !== "USD" && (
                      <div>
                        <Label>ORDER VALUE (USD)</Label>
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
                    <Label className="font-bold">MATERIAL COST</Label>
                    {suppliers.map((row, index) => (
                      <div key={row.id} className="flex gap-10">
                        <Label>{index + 1}.</Label>
                        <div className="flex gap-3">
                          <Label className="font-bold">{row.supplier}</Label>
                        </div>
                        <div className="flex gap-3">
                          <Label>AMOUNT ({row.currency})</Label>
                          <Label className="font-bold">{row.amount}</Label>
                        </div>
                        <div className="flex gap-3">
                          <Label>CURRENCY</Label>
                          <Label className="font-bold">
                            {row.currency === "EUR" ? "Euro" : row.currency}
                          </Label>
                        </div>
                        {row.currency !== "USD" && (
                          <div className="flex gap-3 items-center">
                            <Label>AMOUNT (USD)</Label>
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
                    <Label className="font-bold">MISCELLANEOUS COSTS</Label>
                    {expenses
                      .filter((row) => row.name || row.amount)
                      .map((row, index) => (
                        <div key={row.id} className="flex gap-10">
                          <Label>{index + 1}.</Label>
                          <Label className="font-bold">{row.name}</Label>
                          <div className="flex gap-3">
                            <Label>AMOUNT ({row.currency})</Label>
                            <Label className="font-bold">{row.amount}</Label>
                          </div>
                          <div className="flex gap-3">
                            <Label>CURRENCY</Label>
                            <Label className="font-bold">
                              {row.currency === "EUR" ? "Euro" : row.currency}
                            </Label>
                          </div>
                          {row.currency !== "USD" && (
                            <div className="flex gap-3">
                              <Label>AMOUNT (USD)</Label>
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
                      <Label>GBP TO USD</Label>
                      <Label className="font-bold">
                        {orderDetails?.gbpToUsdRate ?? "Not recorded"}
                      </Label>
                    </div>
                    <div>
                      <Label>EURO TO USD</Label>
                      <Label className="font-bold">
                        {orderDetails?.eurToUsdRate ?? "Not recorded"}
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-10">
                    <div>
                      <Label>ORDER HANDLING FEE (%)</Label>
                      <Label className="font-bold">{orderHandlingFee}</Label>
                    </div>
                    <div>
                      <Label>MISCELLANEOUS HANDLING FEE (%)</Label>
                      <Label className="font-bold">
                        {miscellaneousHandlingFee}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <Link
                href="/home"
                className={cn(`${buttonVariants()}`, "rounded")}
              >
                Back
              </Link>
            </div>
          )}
          <div className="px-4">
            <div className="flex p-4 text-white flex-col gap-3 rounded bg-[#123c26]">
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
                    <Label htmlFor={`panel-currency-${key}`}>{label}:</Label>
                    <div className="flex gap-4">
                      <Label className="font-bold" aria-live="polite">
                        {displayed ?? "—"}
                      </Label>
                      <Select
                        value={panelCurrencies[key]}
                        disabled={!isEditing}
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
                      type="submit"
                      form="order-form"
                      className={actionButtonStyling}
                    >
                      Submit
                    </Button>
                    <Button
                      type="button"
                      className={actionButtonStyling}
                      onClick={() => {
                        // Restore saved fields and currencies before leaving edit mode.
                        if (orderDetails) setLoadedOrderDetails(undefined);
                        setIsEditing(false);
                      }}
                    >
                      Discard Changes
                    </Button>
                  </>
                ) : isAdmin ? (
                  <Button
                    type="button"
                    className={actionButtonStyling}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
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
