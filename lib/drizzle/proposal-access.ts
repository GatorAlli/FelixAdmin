// Roles come from the authenticated user's database profile, never from FormData.
export function canEditOrder(
  status: string | null | undefined,
  orderManagerAccess: boolean,
) {
  return status === "admin" || (status === "order" && orderManagerAccess);
}
