/**
 * app/api/users/[id]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET    /api/users/:id   — get user (admin, or own profile)
 * PUT    /api/users/:id   — update user (admin, or own non-role fields)
 * DELETE /api/users/:id   — delete user (admin only)
 *
 * :id is the user UUID.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserById, updateUser, deleteUser, getAllUsers } from "@/lib/user-store";

type Ctx = { params: Promise<{ id: string }> };

// ── GET ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Only admin or the user themselves can view
  if (session.role !== "admin" && session.email !== user.email) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { passwordHash: _ph, ...safe } = user;
  return NextResponse.json({ ok: true, user: safe });
}

// ── PUT ───────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const isSelf  = session.email === user.email;
  const isAdmin = session.role === "admin";

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string")          patch.name = body.name.trim();
  if (typeof body.alertsEnabled === "boolean") patch.alertsEnabled = body.alertsEnabled;
  if (typeof body.alertEmail === "string")     patch.alertEmail = body.alertEmail.trim() || undefined;
  // Only admin can change roles
  if (isAdmin && (body.role === "admin" || body.role === "user")) {
    patch.role = body.role;
  }

  const updated = await updateUser(user.email, patch);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });

  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json({ ok: true, user: safe });
}

// ── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Prevent deleting last admin
  if (user.role === "admin") {
    const all   = await getAllUsers();
    const admins = all.filter(u => u.role === "admin");
    if (admins.length <= 1) {
      return NextResponse.json({ ok: false, error: "cannot_delete_last_admin" }, { status: 409 });
    }
  }

  await deleteUser(user.email);
  return NextResponse.json({ ok: true });
}
