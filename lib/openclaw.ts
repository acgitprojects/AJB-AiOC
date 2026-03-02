/**
 * lib/openclaw.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed client for the OpenClaw gateway.
 *
 * Supports two integration patterns:
 *  A) HTTP Webhooks  → sendToAgent(), wakeAgent()   (simple, stateless)
 *  B) WebSocket      → OpenClawWSClient              (real-time streaming)
 *
 * Docs: https://github.com/openclaw/openclaw
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export const OPENCLAW_CONFIG = {
  gatewayUrl:        process.env.OPENCLAW_GATEWAY_URL       ?? "http://localhost:18789",
  wsUrl:             process.env.OPENCLAW_WS_URL             ?? "ws://localhost:18789",
  token:             process.env.OPENCLAW_TOKEN              ?? "",
  defaultAgentId:    process.env.OPENCLAW_DEFAULT_AGENT_ID  ?? "hooks",
  sessionPrefix:     process.env.OPENCLAW_SESSION_PREFIX    ?? "webchat",
  timeoutSeconds:    Number(process.env.OPENCLAW_TIMEOUT_SECONDS ?? "60"),
} as const;

// ─── HTTP Types ───────────────────────────────────────────────────────────────

/** Payload for POST /hooks/agent */
export interface HookAgentPayload {
  /** The message / prompt to send to the agent. */
  message: string;
  /** Human-readable hook name (used as prefix in session summaries). */
  name?: string;
  /** Route to a specific agent (falls back to default). */
  agentId?: string;
  /** Custom session key for conversation threading. */
  sessionKey?: string;
  /** If true, send the agent reply to a channel. */
  deliver?: boolean;
  /** Which channel to reply on, e.g. "last", "telegram", "whatsapp". */
  channel?: string;
  /** Recipient for the reply (phone number, user ID, etc.). */
  to?: string;
  /** Override the LLM model, e.g. "openai/gpt-4o". */
  model?: string;
  /** Reasoning effort: "low" | "medium" | "high". */
  thinking?: "low" | "medium" | "high";
  /** Max seconds to wait for an agent reply. */
  timeoutSeconds?: number;
}

/** Response from POST /hooks/agent */
export interface HookAgentResponse {
  ok: boolean;
  reply?: string;
  sessionKey?: string;
  agentId?: string;
  elapsedMs?: number;
  error?: string;
}

/** Payload for POST /hooks/wake */
export interface HookWakePayload {
  text: string;
  mode?: "now" | "next-heartbeat";
}

/** Response from POST /hooks/wake */
export interface HookWakeResponse {
  ok: boolean;
  error?: string;
}

/** Status response from GET / */
export interface GatewayStatusResponse {
  ok: boolean;
  version?: string;
  uptime?: number;
  channels?: string[];
  error?: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function authHeader(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(OPENCLAW_CONFIG.token
      ? { Authorization: `Bearer ${OPENCLAW_CONFIG.token}` }
      : {}),
  };
}

/**
 * Send a message to the OpenClaw agent via POST /hooks/agent.
 * Returns the agent's reply text (or throws on error).
 */
export async function sendToAgent(
  message: string,
  opts: Omit<HookAgentPayload, "message"> = {}
): Promise<HookAgentResponse> {
  const payload: HookAgentPayload = {
    message,
    agentId:        opts.agentId       ?? OPENCLAW_CONFIG.defaultAgentId,
    sessionKey:     opts.sessionKey    ?? `${OPENCLAW_CONFIG.sessionPrefix}:ops-centre`,
    timeoutSeconds: opts.timeoutSeconds ?? OPENCLAW_CONFIG.timeoutSeconds,
    name:           opts.name          ?? "WebChat",
    ...opts,
  };

  const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/hooks/agent`, {
    method:  "POST",
    headers: authHeader(),
    body:    JSON.stringify(payload),
    // Server-side Next.js: disable keep-alive caching for streaming
    cache:   "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Gateway ${res.status}: ${body}` };
  }

  return res.json() as Promise<HookAgentResponse>;
}

/**
 * Wake the OpenClaw agent with a system event via POST /hooks/wake.
 */
export async function wakeAgent(
  text: string,
  mode: HookWakePayload["mode"] = "now"
): Promise<HookWakeResponse> {
  const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/hooks/wake`, {
    method:  "POST",
    headers: authHeader(),
    body:    JSON.stringify({ text, mode } satisfies HookWakePayload),
    cache:   "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Gateway ${res.status}: ${body}` };
  }

  return res.json() as Promise<HookWakeResponse>;
}

/**
 * Check the gateway health via GET /.
 * Returns ok:false (with an error message) if the gateway is unreachable.
 */
export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/`, {
      method:  "GET",
      headers: authHeader(),
      cache:   "no-store",
      // 3-second timeout so the UI doesn't hang
      signal:  AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return { ok: false, error: `Gateway returned ${res.status}` };
    }

    const body = await res.json().catch(() => ({}));
    return { ok: true, ...body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── WebSocket Client ─────────────────────────────────────────────────────────

/** JSON frame types used by the OpenClaw gateway WS protocol. */
export type WSFrameType = "req" | "res" | "event";

export interface WSFrame {
  type: WSFrameType;
  id?: string;
  method?: string;
  params?: unknown;
  ok?: boolean;
  payload?: unknown;
  event?: string;
  seq?: number;
}

export type WSEventHandler = (frame: WSFrame) => void;

/**
 * OpenClawWSClient
 * ─────────────────────────────────────────────────────────────────────────────
 * A lightweight WebSocket wrapper for the OpenClaw gateway.
 *
 * Usage (browser / edge runtime):
 *
 *   const client = new OpenClawWSClient({ onEvent: (frame) => { … } });
 *   await client.connect();
 *   await client.send("Hello Jary");
 *   client.disconnect();
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class OpenClawWSClient {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, (frame: WSFrame) => void>();
  private onEvent: WSEventHandler;
  private requestCounter = 0;

  constructor(opts: { onEvent?: WSEventHandler } = {}) {
    this.onEvent = opts.onEvent ?? (() => {});
  }

  /** Opens the WebSocket and authenticates with the gateway. */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl  = OPENCLAW_CONFIG.wsUrl;
      const token  = OPENCLAW_CONFIG.token;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send the connect/auth handshake
        this.sendRaw({
          type:   "req",
          id:     "connect-handshake",
          method: "connect",
          params: {
            token,
            client: {
              id:       "ops-centre-webchat",
              version:  "1.0.0",
              platform: "web",
              mode:     "webchat",
            },
          },
        });
      };

      this.ws.onmessage = (ev) => {
        let frame: WSFrame;
        try {
          frame = JSON.parse(ev.data as string) as WSFrame;
        } catch {
          return;
        }

        if (frame.type === "res" && frame.id === "connect-handshake") {
          if (frame.ok) resolve();
          else reject(new Error("OpenClaw auth failed"));
          return;
        }

        if (frame.type === "res" && frame.id) {
          const resolver = this.pendingRequests.get(frame.id);
          if (resolver) {
            this.pendingRequests.delete(frame.id);
            resolver(frame);
            return;
          }
        }

        if (frame.type === "event") {
          this.onEvent(frame);
        }
      };

      this.ws.onerror = (e) => reject(e);
      this.ws.onclose = () => {
        // Reject any pending requests that were in-flight
        this.pendingRequests.forEach((r) =>
          r({ type: "res", ok: false, payload: { error: "WebSocket closed" } })
        );
        this.pendingRequests.clear();
      };
    });
  }

  /** Send a message to the agent via the WS gateway. */
  sendMessage(
    message: string,
    opts: Pick<HookAgentPayload, "agentId" | "sessionKey" | "model"> = {}
  ): Promise<WSFrame> {
    const id = String(++this.requestCounter);
    return new Promise((resolve) => {
      this.pendingRequests.set(id, resolve);
      this.sendRaw({
        type:   "req",
        id,
        method: "chat.send",
        params: {
          message,
          agentId:    opts.agentId    ?? OPENCLAW_CONFIG.defaultAgentId,
          sessionKey: opts.sessionKey ?? `${OPENCLAW_CONFIG.sessionPrefix}:ops-centre`,
          model:      opts.model,
        },
      });
    });
  }

  /** Close the WebSocket connection. */
  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  private sendRaw(frame: WSFrame) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("OpenClawWSClient: not connected");
    }
    this.ws.send(JSON.stringify(frame));
  }
}
