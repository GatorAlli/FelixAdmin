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
  return sendAccountEmail({
    ...invitation,
    subject: "Create your Felix Controls password",
    text: `You have been invited to the Felix Controls Order Workspace.\n\nCreate your password using this link:\n${invitation.url}\n\nThis link expires in one hour and can be used once. If it expires, ask your administrator to resend the invitation.\n\nIf you were not expecting this invitation, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail({
  user,
  token,
}: {
  user: { email: string };
  token: string;
}) {
  // Use the configured origin, never a destination supplied by the browser.
  const url = new URL(requireInvitationEmailConfig());
  url.searchParams.set("token", token);
  return sendAccountEmail({
    email: user.email,
    deliveryId: `password-reset-${token}`,
    subject: "Reset your Felix Controls password",
    text: `We received a request to reset your Felix Controls password.\n\nSet your password using this link:\n${url.href}\n\nThis link expires in one hour and can be used once.\n\nIf you did not request this, you can ignore this email. Your password will stay the same.`,
  });
}

async function sendAccountEmail(message: {
  email: string;
  deliveryId: string;
  subject: string;
  text: string;
}) {
  requireInvitationEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.deliveryId,
    },
    body: JSON.stringify({
      from: process.env.RESEND_EMAIL,
      to: [message.email],
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  // Never expose provider responses, API keys, or invitation tokens in logs.
  if (!response.ok) throw new Error("Email delivery failed.");
}
