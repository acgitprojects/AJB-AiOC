/**
 * app/api/users/alerts/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/users/alerts
 * Body: { subject, message, severity?, targetEmails? }
 *
 * Sends an alert email to all users with alertsEnabled=true (or a specific list).
 * Admin only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getAllUsers } from "@/lib/user-store";
import { sendEmail, alertEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: { subject?: string; message?: string; severity?: string; targetEmails?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const subject  = (body.subject ?? "").trim();
  const message  = (body.message ?? "").trim();
  const severity = (body.severity === "warning" || body.severity === "critical")
    ? body.severity : "info";

  if (!subject || !message) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const allUsers = await getAllUsers();
  const targets  = body.targetEmails?.length
    ? allUsers.filter(u => body.targetEmails!.includes(u.email))
    : allUsers.filter(u => u.alertsEnabled);

  const results = await Promise.allSettled(
    targets.map(user => {
      const tpl = alertEmail({ name: user.name, subject, message, severity: severity as "info" | "warning" | "critical" });
      return sendEmail({ to: user.alertEmail ?? user.email, ...tpl });
    }),
  );

  const sent   = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return NextResponse.json({ ok: true, sent, failed, total: targets.length });
}
