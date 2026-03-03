/**
 * app/api/openclaw/status/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/openclaw/status
 *
 * Returns the current reachability and health of the OpenClaw gateway.
 * When API_SERVER_URL is configured, the request is proxied through the
 * API server (Instance B) which then calls OpenClaw (Instance A).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { getGatewayStatus, OPENCLAW_CONFIG } from "@/lib/openclaw";
import { DEMO_MODE } from "@/lib/demo";


export interface GatewayStatusAPIResponse {
  connected:     boolean;
  gatewayUrl:    string;
  viaApiServer:  boolean;
  version?:      string;
  uptime?:       number;
  channels?:     string[];
  agents?:       string[];
  error?:        string;
  checkedAt:     string;
}

export async function GET(): Promise<NextResponse<GatewayStatusAPIResponse>> {
  // In demo mode, skip the real gateway check — return a mock "connected" status
  // so the sidebar dot stays green without needing the actual gateway running.
  if (DEMO_MODE) {
    return NextResponse.json(
      {
        connected:    true,
        gatewayUrl:   OPENCLAW_CONFIG.gatewayUrl,
        viaApiServer: OPENCLAW_CONFIG.viaApiServer,
        version:      "demo",
        uptime:       0,
        channels:     [],
        checkedAt:    new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const status = await getGatewayStatus();

  return NextResponse.json(
    {
      connected:    status.ok,
      gatewayUrl:   OPENCLAW_CONFIG.gatewayUrl,
      viaApiServer: OPENCLAW_CONFIG.viaApiServer,
      version:      status.version,
      uptime:       status.uptime,
      channels:     status.channels,
      error:        status.error,
      checkedAt:    new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

