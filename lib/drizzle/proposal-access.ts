// Roles come from the authenticated user's database profile, never from FormData.
export function canEditProposal(
  status: string | null | undefined,
  proposalManagerAccess: boolean,
) {
  return status === "admin" || (status === "proposal" && proposalManagerAccess);
}
