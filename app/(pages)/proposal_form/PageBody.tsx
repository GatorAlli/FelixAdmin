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
import { createProposal, updateProposal } from "./actions";
import { type Proposal, type DocumentSummary } from "@/lib/drizzle/schema";
import ProposalDocuments, { type DocumentDraft } from "./ProposalDocuments";
import { uploadProposalDocument } from "@/lib/document-uploads";
import { useRouter } from "next/navigation";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_EXCHANGE_RATES,
  convertFromBdt,
  convertToBdt,
  currencies,
  isCurrency,
  type Currency,
  type ExchangeRates,
} from "@/lib/drizzle/currency";
import {
  DEFAULT_PROJECT_STATUS,
  isProjectStatus,
  projectStatuses,
  type ProjectStatus,
} from "@/lib/drizzle/project-status";
import {
  formatProposalDate,
  formatProposalEditDate,
} from "@/lib/drizzle/proposal-date";

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
      className={cn("wrap-break-words min-w-0", props.className, "normal-case")}
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

// "EUR" is shown as "Euro"; every other code is shown as-is.
function currencyLabel(currency: Currency) {
  return currency === "EUR" ? "Euro" : currency;
}

// The four rates the form edits, in display order. Each is "1 unit = X BDT".
const rateFields = [
  ["usdToBdtRate", "USD To BDT"],
  ["sgdToBdtRate", "SGD To BDT"],
  ["eurToBdtRate", "Euro To BDT"],
  ["gbpToBdtRate", "GBP To BDT"],
] as const satisfies readonly (readonly [keyof ExchangeRates, string])[];

// Saved rates come back from Postgres as "125.00"; keep them as two-decimal text.
function ratesFrom(proposal: Proposal): ExchangeRates {
  return {
    usdToBdtRate: proposal.usdToBdtRate,
    sgdToBdtRate: proposal.sgdToBdtRate,
    eurToBdtRate: proposal.eurToBdtRate,
    gbpToBdtRate: proposal.gbpToBdtRate,
  };
}

const inputStyling = clsx("rounded-lg p-2");
const headingStyling = clsx("font-bold text-1.5xl whitespace-normal");
const sectionStyling =
  "grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border p-4 @xl:grid-cols-2";
const sectionHeadingStyling =
  "col-span-full text-[1.21em] font-extrabold underline underline-offset-4";
const fieldStyling =
  "flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6";
const readOnlyTextStyling = "min-w-0 whitespace-pre-wrap wrap-break-words";

// Shared by all panel actions, including the Back link.
const actionButtonStyling =
  "rounded-lg normal-case bg-white text-primary hover:bg-border";

const EMPTY_DOCUMENTS: DocumentSummary[] = [];

export default function PageBody({
  proposalDetails,
  role,
  username,
  currentDate,
  clientSuggestions,
  systemSuggestions,
  initialDocuments = EMPTY_DOCUMENTS,
}: {
  proposalDetails?: Proposal;
  role: string;
  username: string;
  currentDate: string;
  clientSuggestions: string[];
  systemSuggestions: string[];
  initialDocuments?: DocumentSummary[];
}) {
  const router = useRouter();

  // Saved document metadata; refreshed whenever the server sends a new list.
  const [documents, setDocuments] = useState(() => initialDocuments);
  const [loadedDocuments, setLoadedDocuments] = useState(initialDocuments);
  if (initialDocuments !== loadedDocuments) {
    setLoadedDocuments(initialDocuments);
    setDocuments(initialDocuments);
  }
  const [documentBusy, setDocumentBusy] = useState(false);
  const documentBusyRef = useRef(false);
  function setDocumentBusyState(busy: boolean) {
    documentBusyRef.current = busy;
    setDocumentBusy(busy);
  }
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([
    { id: 0, file: null },
  ]);
  const [createdProposalId, setCreatedProposalId] = useState<number>();

  // Existing proposals retain their recorded date; new proposals display today's date.
  const [createdDate, setCreatedDate] = useState<string>(
    proposalDetails ? proposalDetails.createdDate : currentDate,
  );

  // Editable field values are kept here until the form is submitted.
  const [referenceNumber, setReferenceNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [endUser, setEndUser] = useState("");
  const [consultant, setConsultant] = useState("");
  const [system, setSystem] = useState("");
  const [value, setValue] = useState("");
  const [valueCurrency, setValueCurrency] = useState<Currency>("USD");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    DEFAULT_PROJECT_STATUS,
  );
  const [finalizationDate, setFinalizationDate] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");
  const [rates, setRates] = useState<ExchangeRates>({
    ...DEFAULT_EXCHANGE_RATES,
  });
  // Display-only choice for the side panel; never saved.
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");

  const [submissionMessage, setSubmissionMessage] = useTransientMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref blocks a second submit immediately, before React renders disabled buttons.
  const submissionInProgress = useRef(false);
  const [loadedProposal, setLoadedProposal] = useState<Proposal>();

  // The role and per-proposal flag decide whether editing controls are available.
  const canEdit = canEditProposal(
    role,
    proposalDetails?.proposalManagerAccess ?? true,
  );
  const [editingRequested, setIsEditing] = useState(!proposalDetails);
  const isEditing = canEdit && editingRequested;
  const busy = isSubmitting || documentBusy;

  const normalizeNumber = (text: string) => {
    const trimmed = text.trim();
    return trimmed && Number.isFinite(Number(trimmed))
      ? String(Number(trimmed))
      : trimmed;
  };
  // Compare submitted information only, so Submit stays disabled until something changes.
  const formSnapshot = JSON.stringify({
    projectName: projectName.trim(),
    clientName: clientName.trim(),
    endUser: endUser.trim(),
    consultant: consultant.trim(),
    system: system.trim(),
    value: normalizeNumber(value),
    valueCurrency: value.trim() ? valueCurrency : null,
    projectStatus,
    finalizationDate,
    proposalNotes: proposalNotes.trim(),
    rates: Object.fromEntries(
      Object.entries(rates).map(([key, rate]) => [key, normalizeNumber(rate)]),
    ),
  });
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string | null>(
    null,
  );
  if (
    savedFormSnapshot === null &&
    (!proposalDetails || proposalDetails === loadedProposal)
  ) {
    setSavedFormSnapshot(formSnapshot);
  }
  const hasChanges =
    (savedFormSnapshot !== null && formSnapshot !== savedFormSnapshot) ||
    documentDrafts.some((draft) => draft.file !== null);

  // Only load a new proposal once. Without this guard, the setters cause a render loop.
  if (proposalDetails && proposalDetails !== loadedProposal) {
    setSavedFormSnapshot(null);
    setLoadedProposal(proposalDetails);
    setCreatedDate(proposalDetails.createdDate);
    setReferenceNumber(proposalDetails.referenceNumber);
    // Database nulls become empty strings so the inputs can display them.
    setProjectName(proposalDetails.projectName);
    setClientName(proposalDetails.clientName);
    setEndUser(proposalDetails.endUser ?? "");
    setConsultant(proposalDetails.consultant ?? "");
    setSystem(proposalDetails.system ?? "");
    setValue(proposalDetails.valueOriginal ?? "");
    setValueCurrency(proposalDetails.valueCurrency ?? "USD");
    setProjectStatus(proposalDetails.projectStatus);
    setFinalizationDate(proposalDetails.finalizationDate ?? "");
    setProposalNotes(proposalDetails.proposalNotes ?? "");
    setRates(ratesFrom(proposalDetails));
    setIsEditing(false);
  }

  // Recalculated on every render, so the preview always matches the inputs.
  const valueBdt = value.trim()
    ? convertToBdt(value, valueCurrency, rates)
    : null;
  const displayValue =
    valueBdt === null ? null : convertFromBdt(valueBdt, displayCurrency, rates);

  async function submitProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || submissionInProgress.current || documentBusyRef.current)
      return;
    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmissionMessage("");
    // The server action validates these fields and recomputes the BDT value.
    const formData = new FormData(event.currentTarget);
    try {
      const existingId = proposalDetails?.sl ?? createdProposalId;
      const result = existingId
        ? await updateProposal(existingId, formData)
        : await createProposal(formData);
      setSubmissionMessage(result.message);
      if (!result.ok) return;
      const savedId =
        existingId ??
        ("proposalId" in result && typeof result.proposalId === "number"
          ? result.proposalId
          : undefined);
      if (!savedId) throw new Error("The saved proposal ID is missing.");
      // Retain the new ID even if an upload fails, so retry updates this proposal.
      if (!proposalDetails) setCreatedProposalId(savedId);
      if ("createdDate" in result && typeof result.createdDate === "string")
        setCreatedDate(result.createdDate);

      // Files upload only after the proposal exists, through the document API.
      const failures: string[] = [];
      for (const draft of documentDrafts) {
        if (!draft.file) continue;
        try {
          const document = await uploadProposalDocument(savedId, draft.file);
          setDocuments((rows) => [...rows, document]);
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
          `${result.message}. Proposal saved, but some documents failed to upload. Submit again to retry. ${failures.join(" ")}`,
        );
        return;
      }
      setIsEditing(false);
      if (proposalDetails) router.refresh();
      else router.push(`/proposal_form/${savedId}`);
    } catch {
      setSubmissionMessage("Could not save the proposal. Please try again.");
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  // The page switches between editable fields and a read-only proposal summary.
  return (
    <div className={manrope.className}>
      <Navbar />
      <div className="flex flex-col gap-4 px-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
        {proposalDetails && (
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <Label className="text-2xl">{proposalDetails.projectName}</Label>
            <Label className="text-4xl font-thin">|</Label>
            <Label className="text-2xl">{proposalDetails.clientName}</Label>
          </div>
        )}
        <div className="shrink-0">
          <Label className="text-2xl whitespace-nowrap">
            {proposalDetails?.referenceNumber}
          </Label>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {isEditing ? (
            <div className="@container w-full min-w-0 rounded-lg border bg-card p-5 sm:p-6">
              <form
                id="proposal-form"
                onSubmit={submitProposal}
                className="flex flex-col gap-8"
              >
                {/* Project information */}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Project Information</h2>
                  <div className={fieldStyling}>
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
                  <div className={fieldStyling}>
                    <Label
                      className={headingStyling}
                      required
                      htmlFor="clientName"
                    >
                      Client Name
                    </Label>
                    <Input
                      className={inputStyling}
                      id="clientName"
                      name="clientName"
                      required
                      list="client-options"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <datalist id="client-options">
                      {clientSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className={fieldStyling}>
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
                  <div className={fieldStyling}>
                    <Label className={headingStyling} htmlFor="consultant">
                      Consultant
                    </Label>
                    <Input
                      className={inputStyling}
                      id="consultant"
                      name="consultant"
                      type="text"
                      value={consultant}
                      onChange={(e) => setConsultant(e.target.value)}
                    />
                  </div>
                  <div className={fieldStyling}>
                    <Label className={headingStyling} htmlFor="system">
                      System
                    </Label>
                    <Input
                      className={inputStyling}
                      id="system"
                      name="system"
                      list="system-options"
                      type="text"
                      value={system}
                      onChange={(e) => setSystem(e.target.value)}
                    />
                    <datalist id="system-options">
                      {systemSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Proposal value */}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Proposal Value</h2>
                  <div className="col-span-full grid grid-cols-1 items-end gap-4 @xl:grid-cols-[minmax(0,1fr)_8rem]">
                    <div className="flex min-w-0 flex-col gap-2 [&>label]:min-h-6">
                      <Label className={headingStyling} htmlFor="value">
                        Value
                      </Label>
                      <MoneyInput
                        className={inputStyling}
                        id="value"
                        name="value"
                        value={value}
                        onValueChange={setValue}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 [&_[data-slot=select-trigger]]:w-full [&>label]:min-h-6">
                      <Label className={headingStyling} htmlFor="valueCurrency">
                        Currency
                      </Label>
                      <Select
                        value={valueCurrency}
                        onValueChange={(currency) => {
                          if (isCurrency(currency)) setValueCurrency(currency);
                        }}
                      >
                        <SelectTrigger id="valueCurrency">
                          <SelectValue>
                            {currencyLabel(valueCurrency)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currencyLabel(currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="hidden"
                      name="valueCurrency"
                      value={valueCurrency}
                    />
                    {valueCurrency !== "BDT" && (
                      <div className="flex min-w-0 flex-wrap items-center gap-3 @xl:col-span-2">
                        <Label className={headingStyling} htmlFor="valueBdt">
                          Value (BDT)
                        </Label>
                        <Input
                          className={inputStyling}
                          id="valueBdt"
                          value={formatMoney(valueBdt, "")}
                          placeholder="Enter an amount and valid rate"
                          readOnly
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Status</h2>
                  <div
                    className={cn(
                      fieldStyling,
                      "[&_[data-slot=select-trigger]]:w-full",
                    )}
                  >
                    <Label
                      className={headingStyling}
                      required
                      htmlFor="projectStatus"
                    >
                      Project Status
                    </Label>
                    <Select
                      value={projectStatus}
                      onValueChange={(status) => {
                        if (isProjectStatus(status)) setProjectStatus(status);
                      }}
                    >
                      <SelectTrigger id="projectStatus">
                        <SelectValue>{projectStatus}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {projectStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="projectStatus"
                      value={projectStatus}
                    />
                  </div>
                  <div className={fieldStyling}>
                    <Label
                      className={headingStyling}
                      htmlFor="finalizationDate"
                    >
                      Finalization Date
                    </Label>
                    <Input
                      className={inputStyling}
                      id="finalizationDate"
                      name="finalizationDate"
                      type="date"
                      value={finalizationDate}
                      onChange={(e) => setFinalizationDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className={fieldStyling}>
                  <Label className={headingStyling} htmlFor="proposalNotes">
                    Proposal Notes
                  </Label>
                  <textarea
                    className={cn(inputStyling, "min-h-32 border")}
                    id="proposalNotes"
                    name="proposalNotes"
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                  />
                </div>
              </form>
            </div>
          ) : (
            <div className="@container w-full min-w-0 rounded-lg border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-8">
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Project Information</h2>
                  {[
                    ["Project Name", projectName],
                    ["Client Name", clientName],
                    ["End User", endUser],
                    ["Consultant", consultant],
                    ["System", system],
                  ]
                    .filter(([, text]) => text.trim() !== "")
                    .map(([label, text]) => (
                      <p key={label} className={readOnlyTextStyling}>
                        <strong>{label}:</strong> {text}
                      </p>
                    ))}
                </div>
                {value.trim() !== "" && (
                  <div className={sectionStyling}>
                    <h2 className={sectionHeadingStyling}>Proposal Value</h2>
                    <p className={readOnlyTextStyling}>
                      <strong>Value ({currencyLabel(valueCurrency)}):</strong>{" "}
                      {formatMoney(value)}
                    </p>
                    {valueCurrency !== "BDT" && (
                      <p className={readOnlyTextStyling}>
                        <strong>Value (BDT):</strong>{" "}
                        {formatMoney(valueBdt, "—")}
                      </p>
                    )}
                  </div>
                )}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Status</h2>
                  <p className={readOnlyTextStyling}>
                    <strong>Project Status:</strong> {projectStatus}
                  </p>
                  {finalizationDate && (
                    <p className={readOnlyTextStyling}>
                      <strong>Finalization Date:</strong>{" "}
                      {formatProposalDate(finalizationDate)}
                    </p>
                  )}
                </div>
                {proposalNotes.trim() !== "" && (
                  <p className={readOnlyTextStyling}>
                    <strong>Proposal Notes:</strong>
                    <br />
                    {proposalNotes}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* File selections are staged here and uploaded by the form submit handler. */}
          <ProposalDocuments
            key={proposalDetails?.sl ?? "new"}
            proposalId={proposalDetails?.sl ?? createdProposalId}
            initialDocuments={documents}
            drafts={documentDrafts}
            setDrafts={setDocumentDrafts}
            onBusyChange={setDocumentBusyState}
            onUploadedDocumentRemoved={(id) =>
              setDocuments((rows) => rows.filter((row) => row.id !== id))
            }
            editable={isEditing}
            disabled={busy}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Record details, value preview and actions */}
          <div className="flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6">
            {[
              ["Created By:", proposalDetails?.createdBy ?? username],
              ["Date Created:", formatProposalDate(createdDate)],
              [
                "Last Edited By:",
                proposalDetails?.lastEditedBy ?? "Not edited yet",
              ],
              [
                "Last Edited At:",
                proposalDetails?.lastEditedAt
                  ? formatProposalEditDate(proposalDetails.lastEditedAt)
                  : "Not edited yet",
              ],
              ...(referenceNumber
                ? [["Reference Number:", referenceNumber]]
                : []),
            ].map(([label, text]) => (
              <div
                key={label}
                className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4"
              >
                <Label className={headingStyling}>{label}</Label>
                <Label className="justify-end text-right font-bold whitespace-nowrap">
                  {text}
                </Label>
              </div>
            ))}
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
              <Label className={headingStyling}>Value (BDT):</Label>
              <Label className="justify-end text-right font-bold whitespace-nowrap tabular-nums">
                {formatMoney(valueBdt, "—")}
              </Label>
            </div>
            {/* Shows the BDT value in another currency; the choice is not saved. */}
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
              <Label className={headingStyling}>Value In:</Label>
              <div className="flex items-center justify-end gap-2">
                <Label
                  className="font-bold whitespace-nowrap tabular-nums"
                  aria-live="polite"
                >
                  {formatMoney(displayValue, "—")}
                </Label>
                <Select
                  value={displayCurrency}
                  onValueChange={(currency) => {
                    if (isCurrency(currency)) setDisplayCurrency(currency);
                  }}
                >
                  <SelectTrigger
                    aria-label="Show value in currency"
                    className="w-24 bg-white text-foreground"
                  >
                    <SelectValue>{currencyLabel(displayCurrency)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currencyLabel(currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button
                    key="submit-proposal"
                    type="submit"
                    disabled={!hasChanges || busy}
                    form="proposal-form"
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
                    key="discard-proposal"
                    disabled={busy}
                    onClick={() => {
                      setSubmissionMessage("");
                      setDocumentDrafts([{ id: 0, file: null }]);
                      if (createdProposalId && !proposalDetails) {
                        router.push(`/proposal_form/${createdProposalId}`);
                        return;
                      }
                      // A new, unsaved proposal has nothing to return to.
                      if (!proposalDetails) {
                        router.push("/home");
                        return;
                      }
                      // Restore saved fields before leaving edit mode.
                      setLoadedProposal(undefined);
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
                      key="edit-proposal"
                      onClick={(event) => {
                        event.preventDefault();
                        setSubmissionMessage("");
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

          {/* Rates are saved with this proposal. Each one is "1 unit = X BDT". */}
          <section
            aria-labelledby="exchange-rates-heading"
            className="@container flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6"
          >
            <h2
              id="exchange-rates-heading"
              className={cn(headingStyling, "text-lg")}
            >
              Exchange Rates
            </h2>
            <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
              {rateFields.map(([key, label]) => (
                <div key={key} className={fieldStyling}>
                  <Label
                    className={headingStyling}
                    htmlFor={isEditing ? key : undefined}
                  >
                    {label}
                  </Label>
                  {isEditing ? (
                    // Explicit form ownership keeps these sidebar fields in the submission.
                    <Input
                      form="proposal-form"
                      disabled={busy}
                      className={cn(
                        inputStyling,
                        "border-white/30 bg-white text-foreground",
                      )}
                      id={key}
                      name={key}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={rates[key]}
                      onChange={(e) => {
                        const text = e.target.value;
                        if (/^\d*(?:\.\d{0,2})?$/.test(text))
                          setRates((current) => ({ ...current, [key]: text }));
                      }}
                      onBlur={() => {
                        const rate = Number(rates[key]);
                        if (rates[key] !== "" && rate > 0)
                          setRates((current) => ({
                            ...current,
                            [key]: rate.toFixed(2),
                          }));
                      }}
                    />
                  ) : (
                    <Label className="font-bold">
                      {Number(rates[key]).toFixed(2)}
                    </Label>
                  )}
                </div>
              ))}
            </div>
          </section>

          {submissionMessage && (
            <p role="status" className="mt-3 text-black">
              {submissionMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
