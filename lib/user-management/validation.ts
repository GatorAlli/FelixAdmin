export const accessLabels = {
  admin: "Admin",
  order: "Order manager",
  guest: "Guest",
} as const;

export type UserAccess = keyof typeof accessLabels;
export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  access: string | null;
  pending: boolean;
};

export function readInvitation(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Enter the user details.");
  const { name, email, access } = input as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
    throw new Error("Enter a username of at most 200 characters.");
  }
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new Error("Enter a valid email address.");
  }
  if (typeof access !== "string" || !Object.hasOwn(accessLabels, access)) {
    throw new Error("Choose Admin, Order manager, or Guest access.");
  }
  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    access: access as UserAccess,
  };
}

export function readUserId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Invalid user.");
  }
  return value;
}
