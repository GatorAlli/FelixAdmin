"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOrder } from "./actions";
import { useParams } from "next/navigation";

export default function PageBody() {
  // Slug
  const { edit_slug } = useParams<{ edit_slug: string }>();

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

  const [suppliers, setSuppliers] = useState([
    { id: 1, supplier: "", amount: "" },
  ]);
  const nextSupplierId = useRef(2);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmissionMessage("");
        const result = await createOrder(new FormData(e.currentTarget));
        setSubmissionMessage(result.message);
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
        <Label htmlFor="clientOrderValue">Client order value (BDT)</Label>
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
        <Label htmlFor="latestDateOfShipment">Latest date of shipment</Label>
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
            <Label htmlFor="misCost">Miscellaneous cost (BDT)</Label>
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
            <Label htmlFor="emiCost">EMI cost (BDT)</Label>
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
          {suppliers.map((row, index) => (
            <div key={row.id} className="flex">
              <Label>{index + 1}.</Label>
              <Label htmlFor={`supplier-${row.id}`}>Supplier</Label>
              <Input
                id={`supplier-${row.id}`}
                name="supplier"
                placeholder="Supplier"
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
                placeholder="in BDT"
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
                { id, supplier: "", amount: "" },
              ]);
            }}
          >
            +
          </Button>
        </div>
      </div>
      <div>
        <Label htmlFor="payBack">Pay back (BDT)</Label>
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
        <Label htmlFor="totalOrderCost">Total order cost (BDT)</Label>
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
        <Label htmlFor="paymentReceived">Payment received (BDT)</Label>
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
        <Label htmlFor="felixOhAndProfit">Felix overhead & profit (BDT)</Label>
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
      <Button type="submit">Submit</Button>
      {submissionMessage && <p role="status">{submissionMessage}</p>}
    </form>
  );
}
