import type WebSocket from "ws";

const WS_URL = process.env.OPENCLAW_WS_URL       ?? "ws://localhost:18789";
const TOKEN  = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";

const ALLOWED_EVENTS = new Set(["chat"]);

export function handleWsChat(browserWs: WebSocket) {
  const ocSocket = new globalThis.WebSocket(WS_URL);
  const pendingChatIds = new Set<string>();

  // ── OpenClaw side ──────────────────────────────────────────────────────
  ocSocket.addEventListener("open", () => {
    ocSocket.send(JSON.stringify({
      type: "req", id: "hs", method: "connect",
      params: {
        minProtocol: 3, maxProtocol: 3,
        auth: { token: TOKEN },
        client: { id: "gateway-client", version: "1.0", platform: "node", mode: "backend" },
        role: "operator", scopes: ["operator.admin"], caps: [], commands: [], permissions: {},
      },
    }));
  });

  ocSocket.addEventListener("message", ({ data }) => {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(data as string) as Record<string, unknown>; }
    catch { return; }

    if (frame.id === "hs") return;

    if (frame.type === "event" && ALLOWED_EVENTS.has(frame.event as string)) {
      if (browserWs.readyState === browserWs.OPEN) browserWs.send(data as string);
      return;
    }

    if (frame.type === "res" && pendingChatIds.has(frame.id as string)) {
      pendingChatIds.delete(frame.id as string);
      if (browserWs.readyState === browserWs.OPEN) browserWs.send(data as string);
    }
  });

  // ocSocket close/error: don't close browserWs — let chat.send return "Gateway not ready"

  // ── Browser side ───────────────────────────────────────────────────────
  browserWs.on("message", (raw) => {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(raw.toString()) as Record<string, unknown>; }
    catch { return; }

    if (frame.type === "req" && frame.method === "connect") {
      browserWs.send(JSON.stringify({ type: "res", id: frame.id, ok: true, payload: null }));
      return;
    }

    if (frame.type === "req" && frame.method === "chat.send") {
      if (ocSocket.readyState !== ocSocket.OPEN) {
        browserWs.send(JSON.stringify({ type: "res", id: frame.id, ok: false,
          payload: { error: "Gateway not ready" } }));
        return;
      }
      const params = frame.params as Record<string, unknown>;
      const agentId = (params.agentId as string | undefined) ?? "main";
      const { agentId: _a, sessionKey: _sk, ...rest } = params;
      const cleanParams = { ...rest, sessionKey: `agent:${agentId}:main`, deliver: false };
      pendingChatIds.add(frame.id as string);
      ocSocket.send(JSON.stringify({ ...frame, params: cleanParams }));
      return;
    }

    if (frame.type === "req" && frame.method === "chat.history") {
      if (ocSocket.readyState !== ocSocket.OPEN) {
        browserWs.send(JSON.stringify({ type: "res", id: frame.id, ok: false,
          payload: { error: "Gateway not ready" } }));
        return;
      }
      pendingChatIds.add(frame.id as string);
      ocSocket.send(JSON.stringify(frame));
      return;
    }

    if (frame.type === "req") {
      browserWs.send(JSON.stringify({ type: "res", id: frame.id, ok: false,
        payload: { error: "Method not allowed" } }));
    }
  });

  browserWs.on("close", () => ocSocket.close());
  browserWs.on("error", () => ocSocket.close());
}
