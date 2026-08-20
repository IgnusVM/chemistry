import "server-only";

// Resend's HTTP API, not SMTP — cloud providers (Hetzner included) commonly
// block outbound SMTP ports by default on new accounts, but port 443 is
// already open for everything else this app does.
async function sendEmail(params: { to: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[dev] Email to ${params.to}: ${params.subject}\n${params.text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Chemistry <no-reply@chemistry.local>",
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

export async function sendMagicLinkEmail(email: string, url: string) {
  await sendEmail({
    to: email,
    subject: "Your Chemistry sign-in link",
    text: `Sign in to Chemistry: ${url}\n\nThis link expires in 15 minutes.`,
    html: `<p>Sign in to Chemistry:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
  });
}

export async function sendWorkOrderAssignedEmail(params: {
  email: string;
  code: string;
  description: string;
  url: string;
}) {
  const subject = `${params.code} assigned to you: ${params.description}`;
  await sendEmail({
    to: params.email,
    subject,
    text: `You've been assigned ${params.code}: ${params.description}\n\n${params.url}`,
    html: `<p>You've been assigned <strong>${params.code}: ${params.description}</strong>.</p><p><a href="${params.url}">${params.url}</a></p>`,
  });
}
