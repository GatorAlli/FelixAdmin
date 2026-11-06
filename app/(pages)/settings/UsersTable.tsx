"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accessLabels,
  type ManagedUser,
} from "@/lib/user-management/validation";
import { inviteUser, removeUser, resendUserInvitation } from "./user-actions";

export default function UsersTable({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function perform(
    action: () => Promise<{ ok: boolean; message: string }>,
    onSuccess?: () => void,
  ) {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await action();
        setMessage(result.message);
        setError(!result.ok);
        if (result.ok) onSuccess?.();
        router.refresh();
      } catch {
        setError(true);
        setMessage("Could not update users. Please try again.");
      }
    });
  }

  return (
    <section
      aria-labelledby="users-heading"
      className="mx-4 mb-4 rounded-lg border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="users-heading" className="text-2xl font-extrabold">
          Users
        </h2>
        <Button
          type="button"
          disabled={pending}
          aria-expanded={adding}
          aria-controls="add-user-form"
          onClick={() => setAdding(!adding)}
        >
          {adding ? "Cancel" : "Add User"}
        </Button>
      </div>
      {adding && (
        <form
          id="add-user-form"
          className="mt-5 rounded-lg border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            perform(
              () =>
                inviteUser({
                  name: values.get("name"),
                  email: values.get("email"),
                  access: values.get("access"),
                }),
              () => {
                form.reset();
                setAdding(false);
              },
            );
          }}
        >
          <fieldset
            disabled={pending}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Username</Label>
              <Input
                id="new-user-name"
                name="name"
                autoComplete="off"
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                name="email"
                type="email"
                autoComplete="off"
                required
                maxLength={254}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-access">Access</Label>
              <select
                id="new-user-access"
                name="access"
                defaultValue="guest"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {Object.entries(accessLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              The user will receive an email to create their password. The link
              expires in one hour.
            </p>
            <Button type="submit" className="justify-self-start">
              {pending ? "Sending…" : "Send invitation"}
            </Button>
          </fieldset>
        </form>
      )}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Workspace users and their access permissions
          </caption>
          <thead className="border-b">
            <tr>
              {["Username", "Email", "Access", "Status", "Actions"].map(
                (heading) => (
                  <th key={heading} scope="col" className="px-3 py-3 font-bold">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-3 py-4 font-medium">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-muted-foreground">(you)</span>
                  )}
                </td>
                <td className="px-3 py-4">{user.email}</td>
                <td className="px-3 py-4">
                  {user.access && Object.hasOwn(accessLabels, user.access)
                    ? accessLabels[user.access as keyof typeof accessLabels]
                    : "No access"}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  {user.pending ? "Awaiting password" : "Active"}
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    {user.pending && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          perform(() => resendUserInvitation(user.id))
                        }
                      >
                        Resend invitation
                      </Button>
                    )}
                    {user.id !== currentUserId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        aria-label={`Remove ${user.name}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove ${user.name} (${user.email})? They will lose access immediately. Existing orders will be kept.`,
                            )
                          )
                            perform(() => removeUser(user.id));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <p role={error ? "alert" : "status"} className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
