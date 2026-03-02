/**
 * app/api/openclaw/status/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/openclaw/status
 *
 * Returns the current reachability and health of the OpenClaw gateway.
 * Used by the integrations and dashboard pages to show a live status badge.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { getGatewayStatus, OPENCLAW_CONFIG } from "@/lib/openclaw";

export interface GatewayStatusAPIResponse {
  connected: boolean;
  gatewayUrl: string;
  version?: string;
  uptime?: number;
  channels?: string[];
  error?: string;
  checkedAt: string;
}

export async function GET(): Promise<NextResponse<GatewayStatusAPIResponse>> {
  const status = await getGatewayStatus();

  return NextResponse.json(
    {
      connected:  status.ok,
      gatewayUrl: OPENCLAW_CONFIG.gatewayUrl,
      version:    status.version,
      uptime:     status.uptime,
      channels:   status.channels,
      error:      status.error,
      checkedAt:  new Date().toISOString(),
    },
    // Short cache — revalidate every 10 s in production
    { headers: { "Cache-Control": "no-store" } }
  );
}
