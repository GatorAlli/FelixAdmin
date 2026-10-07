"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NewOrder } from "@/lib/drizzle/schema";

const supplierOptions = [
  ["trane", "TRANE"],
  ["belimo", "BELIMO"],
  ["danfoss", "DANFOSS"],
  ["honeywell", "HONEYWELL"],
  ["regeltechnik", "REGELTECHNIK"],
  ["dwyer", "DWYER"],
  ["alps", "ALPS"],
  ["control4", "CONTROL 4"],
  ["lutron", "LUTRON"],
  ["landisGyr", "LANDIS+GYR"],
  ["rbh", "RBH"],
  ["prostar", "PROSTAR"],
  ["gissmatic", "GISSMATIC"],
  ["zkteco", "ZKTECO"],
  ["adteshia", "ADTESHIA"],
  ["fike", "FIKE"],
  ["tecofi", "TECOFI"],
  ["sewo", "SEWO"],
  ["ebelco", "EBELCO"],
  ["dooya", "DOOYA"],
  ["pogo", "POGO"],
  ["parkHelp", "PARK HELP"],
  ["foshan", "FOSHAN"],
  ["kele", "KELE"],
  ["multicable", "MULTICABLE"],
  ["deyz", "DEYZ"],
  ["simens", "SIMENS"],
  ["flashTurtle", "FLASH TURTLE"],
  ["servo", "SERVO"],
  ["haboo", "HABOO"],
  ["others", "OTHERS"],
] as const satisfies readonly (readonly [keyof NewOrder, string])[];

type SupplierKey = (typeof supplierOptions)[number][0];
type OrderFormValues = {
  [Key in Exclude<
    keyof NewOrder,
    "sl" | "suppliers" | "felixOrderRef" | SupplierKey
  >]: string;
};
type SupplierRow = { id: number; supplier: SupplierKey | ""; amount: string };
type Field = {
  name: keyof OrderFormValues;
  label: string;
  type?: "text" | "date" | "number" | "textarea";
  required?: boolean;
};

const initialValues: OrderFormValues = {
  createdBy: "",
  felixSoNo: "",
  felixSoDate: "",
  emiOrderRef: "",
  paymentMode: "",
  clientOrderRef: "",
  clientOrderDate: "",
  clientOrderValue: "",
  projectName: "",
  clientName: "",
  endUser: "",
  productSystem: "",
  ttOrLcRef: "",
  lcDate: "",
  latestDateOfShipment: "",
  dateOfExpiry: "",
  consignee: "",
  orderHandledBy: "",
  emiCost: "",
  misCost: "",
  payBack: "",
  totalOrderCost: "",
  paymentReceived: "",
  felixOhAndProfit: "",
  remarks: "",
};

const sections: { title: string; fields: Field[] }[] = [
  {
    title: "Order details",
    fields: [
      { name: "createdBy", label: "Created by", required: true },
      { name: "felixSoNo", label: "Felix SO number" },
      { name: "felixSoDate", label: "Felix SO date", type: "date" },
      { name: "emiOrderRef", label: "EMI order reference" },
      { name: "paymentMode", label: "Payment mode" },
    ],
  },
  {
    title: "Client & project",
    fields: [
      { name: "clientOrderRef", label: "Client order reference" },
      { name: "clientOrderDate", label: "Client order date", type: "date" },
      { name: "clientOrderValue", label: "Client order value", type: "number" },
      { name: "projectName", label: "Project name" },
      { name: "clientName", label: "Client name" },
      { name: "endUser", label: "End user" },
      { name: "productSystem", label: "Product / system", type: "textarea" },
    ],
  },
  {
    title: "Shipment & handling",
    fields: [
      { name: "ttOrLcRef", label: "TT or L/C reference" },
      { name: "lcDate", label: "L/C date", type: "date" },
      {
        name: "latestDateOfShipment",
        label: "Latest date of shipment",
        type: "date",
      },
      { name: "dateOfExpiry", label: "Date of expiry", type: "date" },
      { name: "consignee", label: "Consignee" },
      { name: "orderHandledBy", label: "Order handled by" },
    ],
  },
];

const costFields: Field[] = [
  { name: "emiCost", label: "EMI cost", type: "number" },
  { name: "misCost", label: "Miscellaneous cost", type: "number" },
  { name: "payBack", label: "Pay back", type: "number" },
  { name: "totalOrderCost", label: "Total order cost", type: "number" },
  { name: "paymentReceived", label: "Payment received", type: "number" },
  {
    name: "felixOhAndProfit",
    label: "Felix overhead & profit",
    type: "number",
  },
];

export default function OrderForm() {
  // Keep decimals and dates as strings while editing, matching the schema's input types.
  const [formValues, setFormValues] = useState<OrderFormValues>(initialValues);
  // Each selected supplier corresponds to its numeric column in the schema.
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([
    { id: 1, supplier: "", amount: "" },
  ]);
  const nextSupplierId = useRef(2);

  function updateField(name: keyof OrderFormValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  function updateSupplier(
    id: number,
    changes: Partial<Omit<SupplierRow, "id">>,
  ) {
    setSupplierRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    );
  }

  function addSupplier() {
    const id = nextSupplierId.current++;
    setSupplierRows((current) => [
      ...current,
      { id, supplier: "", amount: "" },
    ]);
  }

  function renderField(field: Field) {
    return (
      <div key={field.name}>
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span aria-hidden="true"> *</span>}
        </Label>
        {field.type === "textarea" ? (
          <textarea
            id={field.name}
            name={field.name}
            rows={3}
            value={formValues[field.name]}
            onChange={(event) => updateField(field.name, event.target.value)}
          />
        ) : (
          <div>
            <Input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              step={field.type === "number" ? "0.01" : undefined}
              value={formValues[field.name]}
              onChange={(event) => updateField(field.name, event.target.value)}
            />
            {field.type === "number" && <Label htmlFor={field.name}>BDT</Label>}
          </div>
        )}
      </div>
    );
  }

  return (
    <main>
      <header>
        <h1>
          <Label>New order</Label>
        </h1>
        <Label>
          Enter the order details and supplier amounts. Required fields are
          marked with *.
        </Label>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          // TODO: Map formValues and supplierRows to NewOrder and connect submission.
        }}
      >
        {sections.map((section) => (
          <fieldset key={section.title}>
            <legend>
              <Label>{section.title}</Label>
            </legend>
            <div>{section.fields.map(renderField)}</div>
          </fieldset>
        ))}

        <fieldset>
          <legend>
            <Label>Suppliers</Label>
          </legend>
          <div>
            {supplierRows.map((row, index) => (
              <div key={row.id} className="flex">
                <Label>{index + 1}.</Label>
                <Label htmlFor={`supplier-${row.id}`}>Supplier</Label>
                <select
                  id={`supplier-${row.id}`}
                  name={`supplier-${row.id}`}
                  value={row.supplier}
                  onChange={(event) =>
                    updateSupplier(row.id, {
                      supplier: event.target.value as SupplierKey | "",
                    })
                  }
                >
                  <option value="" disabled>
                    Supplier
                  </option>
                  {supplierOptions.map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                      disabled={supplierRows.some(
                        (other) =>
                          other.id !== row.id && other.supplier === value,
                      )}
                    >
                      {label}
                    </option>
                  ))}
                </select>
                <div className="flex">
                  <Label htmlFor={`supplier-amount-${row.id}`}>
                    Amount for supplier {index + 1} in BDT
                  </Label>
                  <Input
                    id={`supplier-amount-${row.id}`}
                    name={`supplier-amount-${row.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(event) =>
                      updateSupplier(row.id, { amount: event.target.value })
                    }
                  />
                  <Label htmlFor={`supplier-amount-${row.id}`}>BDT</Label>
                  <Button
                    type="button"
                    aria-label={`Remove supplier ${index + 1}`}
                    onClick={() =>
                      setSupplierRows((current) =>
                        current.filter((supplier) => supplier.id !== row.id),
                      )
                    }
                  >
                    −
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              aria-label="Add supplier"
              onClick={addSupplier}
              disabled={supplierRows.length >= supplierOptions.length}
            >
              +
            </Button>
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <Label>Costs & payments</Label>
          </legend>
          <div>{costFields.map(renderField)}</div>
        </fieldset>

        <fieldset>
          <legend>
            <Label>Remarks</Label>
          </legend>
          {renderField({
            name: "remarks",
            label: "Additional notes",
            type: "textarea",
          })}
        </fieldset>

        <div>
          <Button type="submit">Submit order</Button>
        </div>
      </form>
    </main>
  );
}
