/**
 * lib/email.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Edge-compatible email service using the Resend REST API.
 * Set RESEND_API_KEY in your environment.  Works in Node.js and Cloudflare Workers.
 *
 * For local dev without a Resend key the email is printed to the console instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.ALERT_FROM_EMAIL ?? "noreply@askjary.com";
const APP_NAME = "AiOC Operations Centre";

export async function sendEmail(opts: EmailOptions): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY ?? "";

  if (!apiKey) {
    // Dev fallback — log to console
    console.log(
      "\n📧  [email dev-mode: no RESEND_API_KEY]\n" +
      `  TO:      ${opts.to}\n` +
      `  SUBJECT: ${opts.subject}\n` +
      `  BODY:    ${opts.text ?? opts.html.replace(/<[^>]+>/g, "")}\n`,
    );
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${APP_NAME} <${FROM}>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (e) {
    console.error("[email] Network error:", e);
    return { ok: false, error: String(e) };
  }
}

// ─── Email templates ─────────────────────────────────────────────────────────

export function passwordResetEmail(opts: {
  name: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const { name, resetUrl, expiresMinutes } = opts;
  return {
    subject: `${APP_NAME} — Password Reset`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#040d18;font-family:Inter,sans-serif;color:#cbd5e1;">
  <div style="max-width:480px;margin:40px auto;background:#0a1628;border:1px solid rgba(0,212,255,0.15);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(139,92,246,0.1));padding:32px 32px 24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#00d4ff,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#040d18;font-size:12px;text-align:center;line-height:36px;">AI</div>
        <span style="color:#00d4ff;font-weight:700;letter-spacing:0.1em;font-size:14px;">AiOC</span>
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Password Reset</h1>
    </div>
    <div style="padding:24px 32px 32px;">
      <p style="margin:0 0 16px;color:#94a3b8;">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6;">
        Someone requested a password reset for your AiOC account. Click the button below to set a new password.
        This link expires in <strong style="color:#f1f5f9;">${expiresMinutes} minutes</strong>.
      </p>
      <a href="${resetUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#040d18;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
        Reset Password
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#475569;line-height:1.6;">
        If you didn't request this, you can safely ignore this email.<br/>
        Link: <a href="${resetUrl}" style="color:#00d4ff;word-break:break-all;">${resetUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    text: `Hi ${name},\n\nReset your AiOC password here:\n${resetUrl}\n\nThis link expires in ${expiresMinutes} minutes.\n\nIf you didn't request this, ignore this email.`,
  };
}

export function alertEmail(opts: {
  name: string;
  subject: string;
  message: string;
  severity?: "info" | "warning" | "critical";
}) {
  const { name, subject, message, severity = "info" } = opts;
  const severityColour =
    severity === "critical" ? "#ef4444" :
    severity === "warning"  ? "#f59e0b" : "#00d4ff";
  const severityLabel =
    severity === "critical" ? "🔴 CRITICAL" :
    severity === "warning"  ? "🟡 WARNING"  : "🔵 INFO";

  return {
    subject: `[${severityLabel}] ${subject}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#040d18;font-family:Inter,sans-serif;color:#cbd5e1;">
  <div style="max-width:520px;margin:40px auto;background:#0a1628;border:1px solid ${severityColour}33;border-radius:16px;overflow:hidden;">
    <div style="background:${severityColour}18;border-bottom:1px solid ${severityColour}33;padding:20px 28px;">
      <span style="color:${severityColour};font-weight:700;font-size:13px;letter-spacing:0.05em;">${severityLabel} ALERT</span>
      <h2 style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f1f5f9;">${subject}</h2>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 12px;color:#94a3b8;">Hi ${name},</p>
      <p style="margin:0;color:#cbd5e1;line-height:1.7;white-space:pre-wrap;">${message}</p>
      <p style="margin:24px 0 0;font-size:11px;color:#475569;">AiOC Operations Centre — automated alert</p>
    </div>
  </div>
</body>
</html>`,
    text: `[${severityLabel}] ${subject}\n\nHi ${name},\n\n${message}\n\n-- AiOC Operations Centre`,
  };
}

export function welcomeEmail(opts: { name: string; email: string; loginUrl: string }) {
  const { name, loginUrl } = opts;
  return {
    subject: `Welcome to ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#040d18;font-family:Inter,sans-serif;color:#cbd5e1;">
  <div style="max-width:480px;margin:40px auto;background:#0a1628;border:1px solid rgba(0,212,255,0.15);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(139,92,246,0.1));padding:32px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Welcome, ${name}! 👋</h1>
    </div>
    <div style="padding:24px 32px 32px;">
      <p style="margin:0 0 16px;color:#94a3b8;line-height:1.6;">
        Your AiOC Operations Centre account has been created. Use your email and the password
        you received from the administrator to sign in.
      </p>
      <a href="${loginUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#040d18;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
        Sign In
      </a>
    </div>
  </div>
</body>
</html>`,
    text: `Welcome, ${name}!\n\nYour AiOC account is ready. Sign in at:\n${loginUrl}`,
  };
}
