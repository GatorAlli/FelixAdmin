import assert from "node:assert/strict";
import { test } from "node:test";
import { canEditProposal } from "./proposal-access";
import { readProposalValues } from "./proposal-values";

function validForm() {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  return form;
}

test("revoking proposal-manager access keeps admins able to edit", () => {
  assert.equal(canEditProposal("admin", true), true);
  assert.equal(canEditProposal("admin", false), true);
  assert.equal(canEditProposal("proposal", true), true);
  assert.equal(canEditProposal("proposal", false), false);
});

test("guests, old order roles and unknown profiles cannot edit", () => {
  for (const status of [
    "guest",
    "order",
    "",
    "ADMIN",
    "unknown",
    null,
    undefined,
  ]) {
    assert.equal(canEditProposal(status, true), false);
    assert.equal(canEditProposal(status, false), false);
  }
});

test("a forged proposal form cannot grant or revoke manager access", () => {
  for (const access of ["true", "false"]) {
    const form = validForm();
    form.set("proposalManagerAccess", access);
    form.set("referenceNumber", "FCL/Quote/1999/001");
    const parsed = readProposalValues(form, "Proposal manager");
    assert.ok(parsed.ok);
    assert.equal(Object.hasOwn(parsed.values, "proposalManagerAccess"), false);
    assert.equal(Object.hasOwn(parsed.values, "referenceNumber"), false);
  }
});

// Attribution is supplied by the server, even when the browser submits a name.
test("the form cannot impersonate another creator", () => {
  const form = validForm();
  form.set("createdBy", "Forged name");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.createdBy, "Current user");
  assert.equal(readProposalValues(form, "").ok, false);
});

test("Project Name, Client Name and Project Status are required", () => {
  const form = new FormData();
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectName", "   ");
  form.set("clientName", "Client");
  form.set("projectStatus", "Current");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectName", "Project");
  form.set("clientName", "  ");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("clientName", "Client");
  form.delete("projectStatus");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectStatus", "Pending");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectStatus", "Secured");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.projectName, "Project");
  assert.equal(result.values.clientName, "Client");
  assert.equal(result.values.projectStatus, "Secured");
});

test("optional fields are trimmed, and blanks are saved as null", () => {
  const form = validForm();
  form.set("endUser", "  End user  ");
  form.set("consultant", "   ");
  form.set("system", " BMS ");
  form.set("proposalNotes", "");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.endUser, "End user");
  assert.equal(result.values.consultant, null);
  assert.equal(result.values.system, "BMS");
  assert.equal(result.values.proposalNotes, null);
  assert.equal(result.values.finalizationDate, null);
});

test("Finalization Date is optional but must be a real date", () => {
  const form = validForm();
  form.set("finalizationDate", "2026-02-30");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("finalizationDate", "30/01/2026");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("finalizationDate", "2026-01-30");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.finalizationDate, "2026-01-30");
});
