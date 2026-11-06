import "server-only";

export function requireInvitationEmailConfig() {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_EMAIL) {
    throw new Error(
      "Set RESEND_API_KEY and RESEND_EMAIL before inviting users.",
    );
  }
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("Set BETTER_AUTH_URL before inviting users.");
  return new URL("/set-password", baseURL).href;
}

export async function sendInvitationEmail(invitation: {
  email: string;
  url: string;
  deliveryId: string;
}) {
  requireInvitationEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": invitation.deliveryId,
    },
    body: JSON.stringify({
      from: process.env.RESEND_EMAIL,
      to: [invitation.email],
      subject: "Create your Felix Controls password",
      text: `You have been invited to the Felix Controls Order Workspace.\n\nCreate your password using this link:\n${invitation.url}\n\nThis link expires in one hour and can be used once. If it expires, ask your administrator to resend the invitation.\n\nIf you were not expecting this invitation, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  // Never expose provider responses, API keys, or invitation tokens in logs.
  if (!response.ok) throw new Error("Invitation delivery failed.");
}
