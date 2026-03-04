/**
 * app/api/pipeline/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/pipeline
 *
 * Returns content pipeline items.
 * Proxies to OpenClaw gateway /pipeline endpoint; falls back to mock.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { PIPELINE_ITEMS } from "@/lib/mock-data";
import { OPENCLAW_CONFIG } from "@/lib/openclaw";


export async function GET() {
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/pipeline`, {
      headers: {
        Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return NextResponse.json(await res.json());
  } catch { /* fall through */ }

  return NextResponse.json(PIPELINE_ITEMS);
}
