import type { GatewayStatus } from "@ajb/contract";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://localhost:18789";

export const openclawHandlers = {
  status: async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/healthz`, { signal: AbortSignal.timeout(3000) });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const status: GatewayStatus = {
        connected: true,
        gatewayUrl: GATEWAY_URL,
        viaApiServer: true,
        checkedAt: new Date().toISOString(),
        version: String(body.version ?? ""),
        channels: Array.isArray(body.channels) ? (body.channels as string[]) : [],
      };
      return { status: 200 as const, body: status };
    } catch (err) {
      const status: GatewayStatus = {
        connected: false,
        gatewayUrl: GATEWAY_URL,
        viaApiServer: true,
        checkedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unreachable",
      };
      return { status: 200 as const, body: status };
    }
  },
  chat: async ({ body }: { body: { message: string; agentId?: string } }) => {
    try {
      const res = await fetch(`${GATEWAY_URL}/hooks/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body.message, agentId: body.agentId ?? "hooks", wakeMode: "now" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { status: 202 as const, body: { ok: true } };
      const data = (await res.json()) as { ok: boolean; runId?: string };
      return { status: 202 as const, body: { ok: data.ok } };
    } catch {
      return { status: 202 as const, body: { ok: true } };
    }
  },
};
