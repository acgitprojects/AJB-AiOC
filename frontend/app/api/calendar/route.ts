/**
 * app/api/calendar/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/calendar
 *
 * Returns calendar tasks keyed by ISO date string.
 * Proxies to OpenClaw gateway /calendar endpoint; falls back to mock.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { CALENDAR_TASKS } from "@/lib/mock-data";
import { OPENCLAW_CONFIG } from "@/lib/openclaw";


export async function GET() {
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/calendar`, {
      headers: {
        Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return NextResponse.json(await res.json());
  } catch { /* fall through */ }

  return NextResponse.json(CALENDAR_TASKS);
}
