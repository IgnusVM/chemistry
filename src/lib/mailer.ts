import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

export async function sendMagicLinkEmail(email: string, url: string) {
  const smtp = getTransporter();
  if (!smtp) {
    console.log(`[dev] Magic link for ${email}: ${url}`);
    return;
  }
  await smtp.sendMail({
    from: process.env.SMTP_FROM ?? "Chemistry <no-reply@chemistry.local>",
    to: email,
    subject: "Your Chemistry sign-in link",
    text: `Sign in to Chemistry: ${url}\n\nThis link expires in 15 minutes.`,
    html: `<p>Sign in to Chemistry:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
  });
}
