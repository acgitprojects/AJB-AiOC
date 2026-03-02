/**
 * lib/openclaw.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed client for the OpenClaw gateway (protocol v3).
 *
 * Supports two integration patterns:
 *  A) HTTP Webhooks  → sendToAgent(), wakeAgent()   (fire-and-forget, async)
 *  B) WebSocket      → OpenClawWSClient              (real-time streaming)
 *
 * Key protocol facts (v2026.3.1+):
 *  • POST /hooks/agent returns 202 {ok, runId} — reply arrives via WS event
 *  • Health endpoint is GET /healthz (not GET /)
 *  • WS auth uses params.auth.token (not params.token)
 *  • WS handshake requires minProtocol/maxProtocol: 3
 *  • chat.send requires an idempotencyKey
 *  • sessionKey in HTTP payload is rejected unless hooks.allowRequestSessionKey: true
 *  • Two separate tokens: gateway.auth.token (WS) ≠ hooks.token (HTTP)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export const OPENCLAW_CONFIG = {
  gatewayUrl:      process.env.OPENCLAW_GATEWAY_URL      ?? "http://localhost:18789",
  wsUrl:           process.env.OPENCLAW_WS_URL            ?? "ws://localhost:18789",
  /** Token used for HTTP hooks endpoints (openclaw.json → hooks.token) */
  hooksToken:      process.env.OPENCLAW_HOOKS_TOKEN       ?? "",
  /** Token used for WebSocket authentication (openclaw.json → gateway.auth.token) */
  wsToken:         process.env.OPENCLAW_WS_TOKEN          ?? "",
  defaultAgentId:  process.env.OPENCLAW_DEFAULT_AGENT_ID ?? "hooks",
  sessionPrefix:   process.env.OPENCLAW_SESSION_PREFIX   ?? "webchat",
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
  /** When to wake the agent: "now" runs immediately; "next-heartbeat" queues. */
  wakeMode?: "now" | "next-heartbeat";
}

/**
 * Response from POST /hooks/agent.
 * The gateway responds 202 immediately — the agent runs async.
 * There is NO inline reply. Replies arrive as WebSocket event frames.
 */
export interface HookAgentResponse {
  ok: boolean;
  /** Opaque run identifier for correlating events. */
  runId?: string;
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

/** Status response from GET /healthz */
export interface GatewayStatusResponse {
  ok: boolean;
  version?: string;
  uptime?: number;
  channels?: string[];
  error?: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function hooksAuthHeader(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(OPENCLAW_CONFIG.hooksToken
      ? { Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}` }
      : {}),
  };
}

/**
 * Fire a message to the OpenClaw agent via POST /hooks/agent.
 *
 * Returns 202 immediately with {ok, runId}.
 * The agent response arrives asynchronously via a WebSocket "chat.reply" event.
 *
 * NOTE: sessionKey is intentionally excluded — sending it to the server without
 * hooks.allowRequestSessionKey: true in openclaw.json causes a 400 error.
 */
export async function sendToAgent(
  message: string,
  opts: Omit<HookAgentPayload, "message"> = {}
): Promise<HookAgentResponse> {
  const payload: HookAgentPayload = {
    message,
    agentId:  opts.agentId  ?? OPENCLAW_CONFIG.defaultAgentId,
    name:     opts.name     ?? "WebChat",
    wakeMode: opts.wakeMode ?? "now",
    ...opts,
  };

  const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/hooks/agent`, {
    method:  "POST",
    headers: hooksAuthHeader(),
    body:    JSON.stringify(payload),
    cache:   "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Gateway ${res.status}: ${body}` };
  }

  // 202 Accepted — {ok: true, runId: "..."}
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
    headers: hooksAuthHeader(),
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
 * Check the gateway health via GET /healthz.
 * Returns ok:false (with an error message) if the gateway is unreachable.
 */
export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/healthz`, {
      method:  "GET",
      headers: hooksAuthHeader(),
      cache:   "no-store",
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

/** JSON frame types used by the OpenClaw gateway WS protocol v3. */
export type WSFrameType = "req" | "res" | "event";

export interface WSFrame {
  type:     WSFrameType;
  id?:      string;
  method?:  string;
  params?:  unknown;
  ok?:      boolean;
  payload?: unknown;
  event?:   string;
  seq?:     number;
}

export type WSEventHandler = (frame: WSFrame) => void;

/**
 * OpenClawWSClient
 * ─────────────────────────────────────────────────────────────────────────────
 * Browser-side WebSocket client for the OpenClaw gateway (protocol v3).
 *
 * Usage:
 *   const client = new OpenClawWSClient({ onEvent: (frame) => { … } });
 *   await client.connect();
 *   const { runId } = await client.sendMessage("Hello");
 *   // reply arrives via onEvent with frame.event === "chat.reply"
 *   client.disconnect();
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class OpenClawWSClient {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, (frame: WSFrame) => void>();
  private onEvent: WSEventHandler;
  private onClose?: () => void;
  private requestCounter = 0;
  private _connected = false;
  private readonly wsUrl: string;
  private readonly wsToken: string;

  constructor(opts: {
    onEvent?: WSEventHandler;
    onClose?: () => void;
    /** Override the WS URL (useful in browser components with NEXT_PUBLIC_ var). */
    wsUrl?: string;
    /** Override the WS token (useful in browser components with NEXT_PUBLIC_ var). */
    wsToken?: string;
  } = {}) {
    this.onEvent  = opts.onEvent  ?? (() => {});
    this.onClose  = opts.onClose;
    this.wsUrl    = opts.wsUrl    ?? OPENCLAW_CONFIG.wsUrl;
    this.wsToken  = opts.wsToken  ?? OPENCLAW_CONFIG.wsToken;
  }

  get connected(): boolean {
    return this._connected;
  }

  /**
   * Opens the WebSocket and performs the protocol v3 authentication handshake.
   * Rejects if auth fails or the socket closes before auth completes.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.wsUrl;
      const token = this.wsToken;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Protocol v3 handshake: auth token must be inside params.auth.token,
        // and minProtocol/maxProtocol must both be set to 3.
        this.sendRaw({
          type:   "req",
          id:     "connect-handshake",
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            auth: { token },
            client: {
              id:       "ops-centre-webchat",
              version:  "1.0.0",
              platform: "web",
              mode:     "webchat",
            },
            role:        "operator",
            scopes:      [],
            caps:        [],
            commands:    [],
            permissions: {},
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
          if (frame.ok) {
            this._connected = true;
            resolve();
          } else {
            reject(new Error("OpenClaw WS auth failed"));
          }
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
        this._connected = false;
        this.pendingRequests.forEach((r) =>
          r({ type: "res", ok: false, payload: { error: "WebSocket closed" } })
        );
        this.pendingRequests.clear();
        this.onClose?.();
      };
    });
  }

  /**
   * Send a message to the agent over WebSocket.
   * Returns immediately with {ok, runId} (equivalent to 202).
   * The agent reply arrives as an onEvent frame where frame.event === "chat.reply".
   *
   * Each call generates a fresh idempotencyKey to prevent duplicate delivery
   * on reconnect scenarios.
   */
  sendMessage(
    message: string,
    opts: Pick<HookAgentPayload, "agentId" | "model"> & { sessionKey?: string } = {}
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
          agentId:        opts.agentId    ?? OPENCLAW_CONFIG.defaultAgentId,
          sessionKey:     opts.sessionKey ?? `${OPENCLAW_CONFIG.sessionPrefix}:ops-centre`,
          model:          opts.model,
          idempotencyKey: crypto.randomUUID(),
        },
      });
    });
  }

  /** Close the WebSocket connection. */
  disconnect() {
    this._connected = false;
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
