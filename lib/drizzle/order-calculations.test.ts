import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateOrderTotals, DEFAULT_PANEL_CURRENCIES } from "./order-calculations";
import { readOrderValues } from "./order-values";

function inputs() {
  return {
    projectValue: "1000", projectCurrency: "USD" as const,
    suppliers: [
      {supplier: "TRANE", amount: "100", currency: "USD" as const},
      {supplier: "BELIMO", amount: "100", currency: "GBP" as const},
    ],
    expenses: [{name: "SHIPPING", amount: "50", currency: "EUR" as const}],
    gbpToUsdRate: "1.3", eurToUsdRate: "1.1",
    orderHandlingFee: "5", miscellaneousHandlingFee: "2",
  };
}

test("all six panel values use the confirmed material/miscellaneous fee bases", () => {
  assert.deepEqual(calculateOrderTotals(inputs()), {
    projectValue: "1000.00", materialCost: "230.00", miscellaneousCost: "55.00",
    orderHandlingCost: "11.50", miscellaneousHandlingCost: "1.10", commission: "702.40",
  });
});

test("totals react to amounts, rates and fees; negative commission is retained", () => {
  assert.equal(calculateOrderTotals({...inputs(), projectValue:"100"}).commission, "-197.60");
  const changed = calculateOrderTotals({...inputs(), gbpToUsdRate:"2", miscellaneousHandlingFee:"10"});
  assert.equal(changed.materialCost,"300.00");
  assert.equal(changed.orderHandlingCost,"15.00");
  assert.equal(changed.miscellaneousHandlingCost,"5.50");
  assert.equal(changed.commission,"624.50");
});

test("zero costs and zero fees are valid; blank optional rows are ignored", () => {
  const result=calculateOrderTotals({...inputs(), suppliers:[{supplier:"", amount:"", currency:"USD"}], expenses:[], orderHandlingFee:"0", miscellaneousHandlingFee:"0"});
  assert.equal(result.materialCost,"0.00");
  assert.equal(result.miscellaneousCost,"0.00");
  assert.equal(result.orderHandlingCost,"0.00");
  assert.equal(result.commission,"1000.00");
});

test("incomplete/invalid prerequisites and overflow do not produce a false commission", () => {
  assert.equal(calculateOrderTotals({...inputs(), projectValue:""}).commission,null);
  assert.equal(calculateOrderTotals({...inputs(), orderHandlingFee:""}).commission,null);
  assert.equal(calculateOrderTotals({...inputs(), orderHandlingFee:"-5"}).commission,null);
  const partial=calculateOrderTotals({...inputs(), suppliers:[{supplier:"TRANE",amount:"",currency:"USD"}]});
  assert.equal(partial.materialCost,null);assert.equal(partial.commission,null);
  const overflow=calculateOrderTotals({...inputs(), suppliers:[{amount:"9999999999999999.99",currency:"USD"},{amount:"0.01",currency:"USD"}]});
  assert.equal(overflow.materialCost,null);assert.equal(overflow.commission,null);
});

test("handling percentages round half cents upward using exact decimals", () => {
  const result=calculateOrderTotals({...inputs(), suppliers:[{amount:"0.01",currency:"USD"}],orderHandlingFee:"50"});
  assert.equal(result.orderHandlingCost,"0.01");
});

test("panel currency choices save with the order, default to USD and reject unknown currencies", () => {
  const f=new FormData();f.set("gbpToUsdRate","1.3");f.set("eurToUsdRate","1.1");f.set("usdToSgdRate","1.3");
  const defaults=readOrderValues(f,"Test");assert.ok(defaults.ok);
  assert.deepEqual(defaults.values.calculationCurrencies,DEFAULT_PANEL_CURRENCIES);
  f.set("panelCurrency-projectValue","EUR");f.set("panelCurrency-commission","GBP");
  const saved=readOrderValues(f,"Test");assert.ok(saved.ok);
  assert.equal(saved.values.calculationCurrencies?.projectValue,"EUR");
  assert.equal(saved.values.calculationCurrencies?.commission,"GBP");
  f.set("panelCurrency-materialCost","AUD");assert.equal(readOrderValues(f,"Test").ok,false);
});
