import type { NewProposal } from "./schema";
import {
  DEFAULT_EXCHANGE_RATES,
  convertToBdt,
  isCurrency,
  isValidRate,
  type ExchangeRates,
} from "./currency";
import { isProjectStatus } from "./project-status";
import { isIsoDate } from "./proposal-date";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Both creating and editing use the same field validation and conversion.
export function readProposalValues(
  formData: FormData,
  authenticatedUsername: string,
):
  | {
      ok: true;
      values: Omit<
        NewProposal,
        | "sl"
        | "referenceNumber"
        | "createdDate"
        | "proposalManagerAccess"
        | "lastEditedBy"
        | "lastEditedAt"
      >;
    }
  | { ok: false; message: string } {
  // The server supplies this name after authentication; FormData cannot override it.
  const createdBy = authenticatedUsername.trim();
  if (!createdBy) {
    return { ok: false, message: "Created by is required." };
  }

  // Project Name, Client Name and Project Status are the only required fields.
  const projectName = readText(formData, "projectName");
  const clientName = readText(formData, "clientName");
  const projectStatus = readText(formData, "projectStatus");
  if (!projectName) return { ok: false, message: "Project Name is required." };
  if (!clientName) return { ok: false, message: "Client Name is required." };
  if (!isProjectStatus(projectStatus)) {
    return {
      ok: false,
      message: "Choose Current, Secured or Lost for Project Status.",
    };
  }

  // Blank rates fall back to the defaults, matching the prefilled form.
  const rates: ExchangeRates = {
    usdToBdtRate:
      readText(formData, "usdToBdtRate") || DEFAULT_EXCHANGE_RATES.usdToBdtRate,
    sgdToBdtRate:
      readText(formData, "sgdToBdtRate") || DEFAULT_EXCHANGE_RATES.sgdToBdtRate,
    eurToBdtRate:
      readText(formData, "eurToBdtRate") || DEFAULT_EXCHANGE_RATES.eurToBdtRate,
    gbpToBdtRate:
      readText(formData, "gbpToBdtRate") || DEFAULT_EXCHANGE_RATES.gbpToBdtRate,
  };
  if (!Object.values(rates).every(isValidRate)) {
    return {
      ok: false,
      message:
        "All four exchange rates must be positive decimals with at most 2 decimal places.",
    };
  }

  // Value is optional. When present, keep the input and recompute BDT on the server.
  const valueOriginal = readText(formData, "value");
  let valueCurrency: NewProposal["valueCurrency"] = null;
  let valueBdt: string | null = null;
  if (valueOriginal) {
    const currency = formData.get("valueCurrency");
    if (!isCurrency(currency)) {
      return { ok: false, message: "Choose a valid currency for the value." };
    }
    valueCurrency = currency;
    valueBdt = convertToBdt(valueOriginal, currency, rates);
    if (valueBdt === null) {
      return {
        ok: false,
        message:
          "Enter a valid value (up to 2 decimal places and within the supported range).",
      };
    }
  }

  const finalizationDate = readText(formData, "finalizationDate");
  if (finalizationDate && !isIsoDate(finalizationDate)) {
    return { ok: false, message: "Enter a valid Finalization Date." };
  }

  // Build the database fields explicitly; unrelated browser fields are ignored.
  const values = {
    createdBy,
    projectName,
    clientName,
    endUser: readText(formData, "endUser") || null,
    consultant: readText(formData, "consultant") || null,
    system: readText(formData, "system") || null,
    valueOriginal: valueOriginal || null,
    valueCurrency,
    valueBdt,
    ...rates,
    projectStatus,
    finalizationDate: finalizationDate || null,
    proposalNotes: readText(formData, "proposalNotes") || null,
  };

  return { ok: true, values };
}
