/**
 * api-server/src/openclaw.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed HTTP client for the OpenClaw gateway.
 * This mirrors the lib/openclaw.ts in AiOC but runs server-side on Instance B,
 * calling the OpenClaw gateway on Instance A over the internal network.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CONFIG } from "./config";

const { gatewayUrl, hooksToken } = CONFIG.openclaw;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HookAgentPayload {
  message: string;
  name?: string;
  agentId?: string;
  deliver?: boolean;
  channel?: string;
  to?: string;
  model?: string;
  thinking?: "low" | "medium" | "high";
  wakeMode?: "now" | "next-heartbeat";
}

export interface HookAgentResponse {
  ok: boolean;
  runId?: string;
  error?: string;
}

export interface GatewayStatusResponse {
  ok: boolean;
  version?: string;
  uptime?: number;
  channels?: string[];
  agents?: string[];
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hooksHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${hooksToken}`,
  };
}

// ─── Gateway health ───────────────────────────────────────────────────────────

export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  try {
    const res = await fetch(`${gatewayUrl}/healthz`, {
      headers: hooksHeaders(),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ok: false, error: `Gateway ${res.status}` };
    return { ok: true, ...(await res.json().catch(() => ({}))) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Agent trigger ────────────────────────────────────────────────────────────

export async function sendToAgent(
  message: string,
  opts: Omit<HookAgentPayload, "message"> = {}
): Promise<HookAgentResponse> {
  const payload: HookAgentPayload = {
    message,
    agentId:  opts.agentId  ?? CONFIG.openclaw.defaultAgentId,
    name:     opts.name     ?? "ApiServer",
    wakeMode: opts.wakeMode ?? "now",
    ...opts,
  };

  try {
    const res = await fetch(`${gatewayUrl}/hooks/agent`, {
      method:  "POST",
      headers: hooksHeaders(),
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Gateway ${res.status}: ${body}` };
    }
    return res.json() as Promise<HookAgentResponse>;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Generic gateway proxy ────────────────────────────────────────────────────

/**
 * Proxy a GET request to the OpenClaw gateway.
 * Returns the parsed JSON body or null on failure.
 */
export async function gatewayGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${gatewayUrl}${path}`, {
      headers: hooksHeaders(),
      signal:  AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

/**
 * Proxy a PATCH request to the OpenClaw gateway.
 */
export async function gatewayPatch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${gatewayUrl}${path}`, {
      method:  "PATCH",
      headers: hooksHeaders(),
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

/**
 * Proxy a POST request to the OpenClaw gateway.
 */
export async function gatewayPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${gatewayUrl}${path}`, {
      method:  "POST",
      headers: hooksHeaders(),
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}
