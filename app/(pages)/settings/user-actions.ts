"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/betterAuth/session";
import { changeManagedUser, UserManagementError } from "@/lib/user-management/service";
import { sendInvitationEmail } from "@/lib/user-management/email";
import { readInvitation, readUserId } from "@/lib/user-management/validation";

async function run(operation: Parameters<typeof changeManagedUser>[1]) {
  const actor = await requireUser();
  let invitation;
  try {
    invitation = await changeManagedUser(actor.id, operation);
  } catch (error) {
    return { ok: false, message: error instanceof UserManagementError
      ? error.message : "Could not update users. Check the details and server email configuration, then try again." };
  }
  revalidatePath("/settings");
  if (invitation) {
    try {
      await sendInvitationEmail(invitation);
    } catch {
      return { ok: false, message: "User saved, but the invitation could not be sent. Check Resend configuration, then resend the invitation after one minute." };
    }
  }
  return { ok: true, message: invitation ? "Invitation sent. The user can create their password from the email." : "User removed. Their active sessions have been revoked." };
}

export async function inviteUser(input: unknown) {
  try { readInvitation(input); } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Invalid user details." };
  }
  return run({ kind: "invite", input });
}

export async function resendUserInvitation(id: unknown) {
  try { readUserId(id); } catch { return { ok: false, message: "Invalid user." }; }
  return run({ kind: "resend", id });
}

export async function removeUser(id: unknown) {
  try { readUserId(id); } catch { return { ok: false, message: "Invalid user." }; }
  return run({ kind: "remove", id });
}
