"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { createOrder, updateOrder } from "./actions";
import { type Order } from "@/lib/drizzle/schema";
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
  isCurrency,
  restoreSupplierRows,
  type SupplierRow,
} from "@/lib/drizzle/currency";

export default function PageBody({
  orderDetails,
  isAdmin,
}: {
  orderDetails?: Order;
  isAdmin: boolean;
}) {
  // States
  const [createdBy, setCreatedBy] = useState("");
  const [felixSoNo, setFelixSoNo] = useState("");
  const [felixSoDate, setFelixSoDate] = useState("");
  const [emiOrderRef, setEmiOrderRef] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [clientOrderRef, setClientOrderRef] = useState("");
  const [clientOrderDate, setClientOrderDate] = useState("");
  const [clientOrderValue, setClientOrderValue] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [endUser, setEndUser] = useState("");
  const [productSystem, setProductSystem] = useState("");
  const [ttOrLcRef, setTtOrLcRef] = useState("");
  const [lcDate, setLcDate] = useState("");
  const [latestDateOfShipment, setLatestDateOfShipment] = useState("");
  const [dateOfExpiry, setDateOfExpiry] = useState("");
  const [consignee, setConsignee] = useState("");
  const [orderHandledBy, setOrderHandledBy] = useState("");
  const [emiCost, setEmiCost] = useState("");
  const [misCost, setMisCost] = useState("");
  const [payBack, setPayBack] = useState("");
  const [totalOrderCost, setTotalOrderCost] = useState("");
  const [paymentReceived, setPaymentReceived] = useState("");
  const [felixOhAndProfit, setFelixOhAndProfit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");

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
    // Database nulls become empty strings so the inputs can display them.
    setCreatedBy(orderDetails.createdBy ?? "");
    setFelixSoNo(orderDetails.felixSoNo ?? "");
    setFelixSoDate(orderDetails.felixSoDate ?? "");
    setEmiOrderRef(orderDetails.emiOrderRef ?? "");
    setPaymentMode(orderDetails.paymentMode ?? "");
    setClientOrderRef(orderDetails.clientOrderRef ?? "");
    setClientOrderDate(orderDetails.clientOrderDate ?? "");
    setClientOrderValue(orderDetails.clientOrderValue ?? "");
    setProjectName(orderDetails.projectName ?? "");
    setClientName(orderDetails.clientName ?? "");
    setEndUser(orderDetails.endUser ?? "");
    setProductSystem(orderDetails.productSystem ?? "");
    setTtOrLcRef(orderDetails.ttOrLcRef ?? "");
    setLcDate(orderDetails.lcDate ?? "");
    setLatestDateOfShipment(orderDetails.latestDateOfShipment ?? "");
    setDateOfExpiry(orderDetails.dateOfExpiry ?? "");
    setConsignee(orderDetails.consignee ?? "");
    setOrderHandledBy(orderDetails.orderHandledBy ?? "");
    setEmiCost(orderDetails.emiCost ?? "");
    setMisCost(orderDetails.misCost ?? "");
    setPayBack(orderDetails.payBack ?? "");
    setTotalOrderCost(orderDetails.totalOrderCost ?? "");
    setPaymentReceived(orderDetails.paymentReceived ?? "");
    setFelixOhAndProfit(orderDetails.felixOhAndProfit ?? "");
    setRemarks(orderDetails.remarks ?? "");
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

  return (
    <div>
      {isEditing ? (
        <div>
          <form
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
                const result = await createOrder(new FormData(e.currentTarget));
                setSubmissionMessage(result.message);
              }
            }}
            className="p-4 flex flex-col gap-10"
          >
            <div>
              <Label htmlFor="createdBy">Created by</Label>
              <Input
                id="createdBy"
                name="createdBy"
                type="text"
                required
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="felixSoNo">Felix SO number</Label>
              <Input
                id="felixSoNo"
                name="felixSoNo"
                type="text"
                value={felixSoNo}
                onChange={(e) => setFelixSoNo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="felixSoDate">Felix SO date</Label>
              <Input
                id="felixSoDate"
                name="felixSoDate"
                type="date"
                value={felixSoDate}
                onChange={(e) => setFelixSoDate(e.target.value)}
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
              <Label htmlFor="clientName">Client name</Label>
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
              <Label htmlFor="emiOrderRef">EMI order reference</Label>
              <Input
                id="emiOrderRef"
                name="emiOrderRef"
                type="text"
                value={emiOrderRef}
                onChange={(e) => setEmiOrderRef(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-2xl">Payment Mode</Label>
              <div className="flex justify-between">
                <Label htmlFor="paymentMode">LC</Label>
                <Input
                  id="paymentMode"
                  name="paymentMode"
                  type="radio"
                  value={paymentMode}
                  checked={paymentMode === "LC" && paymentModeOther !== "Other"}
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
                  checked={paymentMode === "TT" && paymentModeOther !== "Other"}
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
              <Label htmlFor="clientOrderRef">Client order reference</Label>
              <Input
                id="clientOrderRef"
                name="clientOrderRef"
                type="text"
                value={clientOrderRef}
                onChange={(e) => setClientOrderRef(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="clientOrderDate">Client order date</Label>
              <Input
                id="clientOrderDate"
                name="clientOrderDate"
                type="date"
                value={clientOrderDate}
                onChange={(e) => setClientOrderDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="clientOrderValue">Client order value (USD)</Label>
              <Input
                id="clientOrderValue"
                name="clientOrderValue"
                type="number"
                step="0.01"
                value={clientOrderValue}
                onChange={(e) => setClientOrderValue(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="productSystem" className="text-2xl">
                Product/System
              </Label>

              <div className="flex">
                <Label>BMS</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("BMS")}
                />
              </div>
              <div className="flex">
                <Label>FDAS</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("FDAS")}
                />
              </div>
              <div className="flex">
                <Label>CCTV</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("CCTV")}
                />
              </div>

              <div className="flex">
                <Label>HVAC Products</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("HVAC Products")}
                />
              </div>

              <div className="flex">
                <Label>PA</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("PA")}
                />
              </div>

              <div className="flex">
                <Label>VFD</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("VFD")}
                />
              </div>

              <div className="flex">
                <Label>Home Automation</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("Home Automation")}
                />
              </div>

              <div className="flex">
                <Label>Fire Suppression</Label>
                <Input
                  id="productSystem"
                  name="productSystem"
                  type="radio"
                  value={productSystem}
                  onChange={() => setProductSystem("Fire Suppression")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ttOrLcRef">TT or L/C reference</Label>
              <Input
                id="ttOrLcRef"
                name="ttOrLcRef"
                type="text"
                value={ttOrLcRef}
                onChange={(e) => setTtOrLcRef(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lcDate">L/C date</Label>
              <Input
                id="lcDate"
                name="lcDate"
                type="date"
                value={lcDate}
                onChange={(e) => setLcDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="latestDateOfShipment">
                Latest date of shipment
              </Label>
              <Input
                id="latestDateOfShipment"
                name="latestDateOfShipment"
                type="date"
                value={latestDateOfShipment}
                onChange={(e) => setLatestDateOfShipment(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateOfExpiry">Date of expiry</Label>
              <Input
                id="dateOfExpiry"
                name="dateOfExpiry"
                type="date"
                value={dateOfExpiry}
                onChange={(e) => setDateOfExpiry(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="consignee">Consignee</Label>
              <Input
                id="consignee"
                name="consignee"
                type="text"
                value={consignee}
                onChange={(e) => setConsignee(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="orderHandledBy">Order handled by</Label>
              <Input
                placeholder="EMI Engineering/Taxilla Impex/Cord Engineering/Others"
                id="orderHandledBy"
                name="orderHandledBy"
                type="text"
                value={orderHandledBy}
                onChange={(e) => setOrderHandledBy(e.target.value)}
              />
            </div>

            {/* Supplier names use inputs, with suggestions for the brands in the schema. */}
            <div className="flex justify-between gap-10">
              <div>
                <div>
                  <Label htmlFor="misCost">Miscellaneous cost (USD)</Label>
                  <Input
                    id="misCost"
                    name="misCost"
                    type="number"
                    step="0.01"
                    value={misCost}
                    onChange={(e) => setMisCost(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emiCost">EMI cost (USD)</Label>
                  <Input
                    id="emiCost"
                    name="emiCost"
                    type="number"
                    step="0.01"
                    value={emiCost}
                    onChange={(e) => setEmiCost(e.target.value)}
                  />
                </div>
              </div>
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

                <Label className="text-2xl">SUPPLIERS</Label>
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
                    <Label htmlFor={`supplier-amount-${row.id}`}>Amount</Label>
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
                            item.id === row.id ? { ...item, currency } : item,
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
                      <div>
                        <Label htmlFor={`supplier-usd-${row.id}`}>
                          AMOUNT (USD)
                        </Label>
                        <Input
                          id={`supplier-usd-${row.id}`}
                          value={
                            convertToUsd(
                              row.amount,
                              row.currency,
                              gbpToUsdRate,
                              eurToUsdRate,
                            ) ?? ""
                          }
                          placeholder="Enter an amount and valid rate"
                          readOnly
                        />
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
            </div>
            <div>
              <Label htmlFor="payBack">Pay back (USD)</Label>
              <Input
                id="payBack"
                name="payBack"
                type="number"
                step="0.01"
                value={payBack}
                onChange={(e) => setPayBack(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="totalOrderCost">Total order cost (USD)</Label>
              <Input
                id="totalOrderCost"
                name="totalOrderCost"
                type="number"
                step="0.01"
                value={totalOrderCost}
                onChange={(e) => setTotalOrderCost(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="paymentReceived">Payment received (USD)</Label>
              <Input
                id="paymentReceived"
                name="paymentReceived"
                type="number"
                step="0.01"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="felixOhAndProfit">
                Felix overhead & profit (USD)
              </Label>
              <Input
                id="felixOhAndProfit"
                name="felixOhAndProfit"
                type="number"
                step="0.01"
                value={felixOhAndProfit}
                onChange={(e) => setFelixOhAndProfit(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                name="remarks"
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
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
            <div>
              <Button type="submit">Submit</Button>
              <Button
                type="button"
                onClick={() => {
                  // Restore the saved amounts and rates when discarding edits.
                  if (orderDetails) setLoadedOrderDetails(undefined);
                  setIsEditing(false);
                }}
              >
                Discard Changes
              </Button>
            </div>
            {submissionMessage && <p role="status">{submissionMessage}</p>}
          </form>
        </div>
      ) : (
        <div>
          {isAdmin ? (
            <Button
              onClick={() => {
                setIsEditing(!isEditing);
              }}
            >
              Edit
            </Button>
          ) : (
            <div></div>
          )}
          <div className="p-4 flex flex-col gap-10">
            <div>
              <Label>Created by</Label>
              <Label className="font-bold">{createdBy}</Label>
            </div>

            <div>
              <Label>Felix SO number</Label>
              <Label className="font-bold">{felixSoNo}</Label>
            </div>

            <div>
              <Label>Felix SO date</Label>
              <Label className="font-bold">{felixSoDate}</Label>
            </div>
            <div>
              <Label>Project name</Label>
              <Label className="font-bold">{projectName}</Label>
            </div>

            <div>
              <Label>Client name</Label>
              <Label className="font-bold">{clientName}</Label>
            </div>

            <div>
              <Label>End user</Label>
              <Label className="font-bold">{endUser}</Label>
            </div>
            <div>
              <Label>EMI order reference</Label>
              <Label className="font-bold">{emiOrderRef}</Label>
            </div>

            <div>
              <Label className="text-2xl">Payment Mode</Label>

              <div className="flex justify-between">
                <Label htmlFor="paymentModeLC">LC</Label>
                <Input
                  id="paymentModeLC"
                  name="paymentMode"
                  type="radio"
                  value="LC"
                  checked={paymentMode === "LC" && paymentModeOther !== "Other"}
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
                  checked={paymentMode === "TT" && paymentModeOther !== "Other"}
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
              <Label>Client order reference</Label>
              <Label className="font-bold">{clientOrderRef}</Label>
            </div>

            <div>
              <Label>Client order date</Label>
              <Label className="font-bold">{clientOrderDate}</Label>
            </div>

            <div>
              <Label>Client order value (USD)</Label>
              <Label className="font-bold">{clientOrderValue}</Label>
            </div>

            <div>
              <Label className="text-2xl">Product/System</Label>

              <div className="flex">
                <Label htmlFor="productBMS">BMS</Label>
                <Input
                  id="productBMS"
                  name="productSystem"
                  type="radio"
                  value="BMS"
                  checked={productSystem === "BMS"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productFDAS">FDAS</Label>
                <Input
                  id="productFDAS"
                  name="productSystem"
                  type="radio"
                  value="FDAS"
                  checked={productSystem === "FDAS"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productCCTV">CCTV</Label>
                <Input
                  id="productCCTV"
                  name="productSystem"
                  type="radio"
                  value="CCTV"
                  checked={productSystem === "CCTV"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productHVAC">HVAC Products</Label>
                <Input
                  id="productHVAC"
                  name="productSystem"
                  type="radio"
                  value="HVAC Products"
                  checked={productSystem === "HVAC Products"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productPA">PA</Label>
                <Input
                  id="productPA"
                  name="productSystem"
                  type="radio"
                  value="PA"
                  checked={productSystem === "PA"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productVFD">VFD</Label>
                <Input
                  id="productVFD"
                  name="productSystem"
                  type="radio"
                  value="VFD"
                  checked={productSystem === "VFD"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productHomeAutomation">Home Automation</Label>
                <Input
                  id="productHomeAutomation"
                  name="productSystem"
                  type="radio"
                  value="Home Automation"
                  checked={productSystem === "Home Automation"}
                  disabled
                />
              </div>

              <div className="flex">
                <Label htmlFor="productFireSuppression">Fire Suppression</Label>
                <Input
                  id="productFireSuppression"
                  name="productSystem"
                  type="radio"
                  value="Fire Suppression"
                  checked={productSystem === "Fire Suppression"}
                  disabled
                />
              </div>
            </div>

            <div>
              <Label>TT or L/C reference</Label>
              <Label className="font-bold">{ttOrLcRef}</Label>
            </div>

            <div>
              <Label>L/C date</Label>
              <Label className="font-bold">{lcDate}</Label>
            </div>

            <div>
              <Label>Latest date of shipment</Label>
              <Label className="font-bold">{latestDateOfShipment}</Label>
            </div>

            <div>
              <Label>Date of expiry</Label>
              <Label className="font-bold">{dateOfExpiry}</Label>
            </div>

            <div>
              <Label>Consignee</Label>
              <Label className="font-bold">{consignee}</Label>
            </div>

            <div>
              <Label>Order handled by</Label>
              <Label className="font-bold">{orderHandledBy}</Label>
            </div>

            <div className="flex justify-between gap-10">
              <div>
                <div>
                  <Label>Miscellaneous cost (USD)</Label>
                  <Label className="font-bold">{misCost}</Label>
                </div>

                <div>
                  <Label>EMI cost (USD)</Label>
                  <Label className="font-bold">{emiCost}</Label>
                </div>
              </div>

              <div>
                <Label className="text-2xl">SUPPLIERS</Label>
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
            </div>

            <div>
              <Label>Pay back (USD)</Label>
              <Label className="font-bold">{payBack}</Label>
            </div>

            <div>
              <Label>Total order cost (USD)</Label>
              <Label className="font-bold">{totalOrderCost}</Label>
            </div>

            <div>
              <Label>Payment received (USD)</Label>
              <Label className="font-bold">{paymentReceived}</Label>
            </div>

            <div>
              <Label>Felix overhead & profit (USD)</Label>
              <Label className="font-bold">{felixOhAndProfit}</Label>
            </div>

            <div>
              <Label>Remarks</Label>
              <Label className="font-bold">{remarks}</Label>
            </div>
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
          </div>
          <Link href="/home" className={buttonVariants()}>
            Back
          </Link>
        </div>
      )}
    </div>
  );
}
