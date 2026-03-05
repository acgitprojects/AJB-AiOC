import type { GatewayStatus, OcAgent } from "@ajb/contract";
import { ocWsRequest } from "../lib/openclaw-ws";
import * as configRepo from "../repositories/openclaw-config.repository";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://localhost:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
const CONTAINER = process.env.OPENCLAW_CONTAINER_NAME ?? "openclaw";
const OC_WORKSPACE = "/home/node/.openclaw/workspace";

function ocCliExec(
  ...args: string[]
): { ok: boolean; data?: unknown; error?: string } {
  const proc = Bun.spawnSync(["docker", "exec", CONTAINER, "openclaw", ...args]);
  if (proc.exitCode !== 0) {
    return { ok: false, error: new TextDecoder().decode(proc.stderr).trim() };
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(proc.stdout)) };
  } catch {
    return { ok: true, data: null };
  }
}

export const openclawHandlers = {
  status: async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/healthz`, {
        signal: AbortSignal.timeout(3000),
        headers: GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {},
      });
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
  agents: {
    list: async () => {
      try {
        const payload = (await ocWsRequest("agents.list", {})) as { defaultId?: string; agents?: OcAgent[] } | null;
        const agents = payload?.agents ?? [];
        const defaultId = payload?.defaultId;
        const configs = await configRepo.findAll().catch(() => []);
        const configMap = new Map(configs.map(c => [c.agentId, c]));
        return {
          status: 200 as const,
          body: agents.map(a => {
            const raw = a as unknown as { identity?: { name?: string; emoji?: string } };
            return {
              ...a,
              isDefault: a.id === defaultId,
              routes: a.routes ?? [],
              name:  raw.identity?.name  ?? a.name,
              emoji: raw.identity?.emoji ?? a.emoji,
              model: configMap.get(a.id)?.model,
              tools: configMap.get(a.id)?.tools,
            };
          }),
        };
      } catch {
        return { status: 200 as const, body: [] };
      }
    },

    create: async ({ body }: { body: { id: string; model?: string } }) => {
      const r = ocCliExec(
        "agents", "add", body.id, "--non-interactive",
        "--workspace", OC_WORKSPACE, "--json",
        ...(body.model ? ["--model", body.model] : [])
      );
      if (!r.ok) return { status: 400 as const, body: { error: r.error ?? "Failed to create agent" } };
      if (body.model) await configRepo.upsert(body.id, body.model).catch(() => {});
      // Use CLI output directly — avoids WS timing race after config write
      const created = r.data as { agentId?: string; name?: string } | null;
      return { status: 201 as const, body: { id: created?.agentId ?? body.id, name: created?.name ?? body.id, isDefault: false, routes: [] } as OcAgent };
    },

    files: async ({ params }: { params: { id: string } }) => {
      try {
        const listPayload = (await ocWsRequest("agents.files.list", { agentId: params.id })) as {
          files?: { name: string; missing: boolean }[];
        } | null;
        const fileNames = (listPayload?.files ?? []).map(f => f.name);
        const results = await Promise.all(
          fileNames.map(async name => {
            try {
              const r = (await ocWsRequest("agents.files.get", { agentId: params.id, name })) as {
                file?: { name: string; content: string; missing: boolean };
              } | null;
              return { name, content: r?.file?.content ?? "", missing: r?.file?.missing ?? false };
            } catch {
              return { name, content: "", missing: true };
            }
          })
        );
        return { status: 200 as const, body: results };
      } catch {
        return { status: 200 as const, body: [] };
      }
    },

    update: async ({ params, body }: { params: { id: string }; body: { files?: Record<string, string>; name?: string; emoji?: string; model?: string; tools?: string[] } }) => {
      // Fetch current state before mutations to avoid WS reload race
      const preFetch = (await ocWsRequest("agents.list", {}).catch(() => null)) as { agents?: OcAgent[] } | null;
      const existing = (preFetch?.agents ?? []).find(a => a.id === params.id);
      if (!existing) return { status: 404 as const, body: { message: "Agent not found" } };

      if (body.files) {
        await Promise.all(
          Object.entries(body.files).map(([name, content]) =>
            ocWsRequest("agents.files.set", { agentId: params.id, name, content }).catch(() => {})
          )
        );
      }
      if (body.name || body.emoji) {
        const idArgs = ["agents", "set-identity", "--agent", params.id, "--json"];
        if (body.name) idArgs.push("--name", body.name);
        if (body.emoji) idArgs.push("--emoji", body.emoji);
        ocCliExec(...idArgs);
      }
      if (body.model !== undefined || body.tools !== undefined)
        await configRepo.upsert(params.id, body.model, body.tools);

      const cfg = await configRepo.findAll().then(cs => cs.find(c => c.agentId === params.id)).catch(() => undefined);
      const existingRaw = existing as unknown as { identity?: { name?: string; emoji?: string } };
      // Construct response from known mutations — avoids WS timing race after CLI config write
      return { status: 200 as const, body: {
        ...existing,
        name:  body.name  ?? existingRaw.identity?.name  ?? existing.name,
        emoji: body.emoji ?? existingRaw.identity?.emoji ?? existing.emoji,
        model: cfg?.model,
        tools: cfg?.tools,
      } };
    },

    delete: async ({ params }: { params: { id: string } }) => {
      const listPayload = (await ocWsRequest("agents.list", {}).catch(() => null)) as { defaultId?: string; agents?: OcAgent[] } | null;
      const agents = listPayload?.agents ?? [];
      const agent = agents.find(a => a.id === params.id);
      if (agent?.id === listPayload?.defaultId)
        return { status: 400 as const, body: { error: "Cannot delete the default agent" } };
      const r = ocCliExec("agents", "delete", params.id, "--force", "--json");
      if (!r.ok) return { status: 400 as const, body: { error: r.error ?? "Failed" } };
      await configRepo.remove(params.id).catch(() => {});
      return { status: 200 as const, body: { ok: true } };
    },
  },

  models: async () => {
    try {
      const [modelsPayload, configPayload] = await Promise.all([
        ocWsRequest("models.list", {}),
        ocWsRequest("config.get", {}).catch(() => null),
      ]) as [
        { models?: Array<{ id: string; name: string; provider?: string; contextWindow?: number; reasoning?: boolean }> } | null,
        { parsed?: { auth?: { profiles?: Record<string, { provider?: string }> } } } | null
      ];

      const all = modelsPayload?.models ?? [];

      const profiles = configPayload?.parsed?.auth?.profiles ?? {};
      const configuredProviders = new Set(
        Object.values(profiles).map(p => p.provider).filter((p): p is string => Boolean(p))
      );

      const body = configuredProviders.size > 0
        ? all.filter(m => m.provider && configuredProviders.has(m.provider))
        : all;

      return { status: 200 as const, body };
    } catch {
      return { status: 200 as const, body: [] };
    }
  },

  chat: async ({ body }: { body: { message: string; agentId?: string } }) => {
    try {
      const res = await fetch(`${GATEWAY_URL}/hooks/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
        },
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
