/**
 * api-server/src/ws.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * WebSocket proxy — bridges AiOC browser clients to the OpenClaw gateway.
 *
 * Flow:
 *   Browser → wss://api.askjary.com/ws?token=<API_SERVER_SECRET>
 *         → api-server (this file) validates token
 *         → ws://OpenClaw (Instance A internal IP)
 *   All frames are forwarded bidirectionally.
 *
 * The browser uses NEXT_PUBLIC_OPENCLAW_WS_URL=wss://api.askjary.com/ws
 * instead of connecting directly to Instance A.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { CONFIG } from "./config";

export function attachWebSocketProxy(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (clientSocket: WebSocket, req: IncomingMessage) => {
    // ── Auth: token must be in query string or Authorization header ──────────
    const url    = new URL(req.url ?? "/", "http://localhost");
    const qToken = url.searchParams.get("token") ?? "";
    const hToken = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    const token  = qToken || hToken;

    if (token !== CONFIG.apiSecret) {
      clientSocket.close(4001, "unauthorized");
      console.warn("[ws] Rejected connection — invalid token");
      return;
    }

    console.log(`[ws] Client connected from ${req.socket.remoteAddress}`);

    // ── Open upstream connection to OpenClaw ─────────────────────────────────
    const upstreamUrl = CONFIG.openclaw.wsUrl;
    const upstream    = new WebSocket(upstreamUrl);

    upstream.on("open", () => {
      console.log(`[ws] Upstream connected → ${upstreamUrl}`);
    });

    upstream.on("error", (err) => {
      console.error("[ws] Upstream error:", err.message);
      clientSocket.close(1011, "upstream_error");
    });

    upstream.on("close", (code, reason) => {
      console.log(`[ws] Upstream closed: ${code} ${reason}`);
      clientSocket.close(code, reason);
    });

    // ── Bidirectional forwarding ──────────────────────────────────────────────

    // Browser → OpenClaw
    clientSocket.on("message", (data) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data);
      }
    });

    // OpenClaw → Browser
    upstream.on("message", (data) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data);
      }
    });

    // Client disconnected
    clientSocket.on("close", (code, reason) => {
      console.log(`[ws] Client disconnected: ${code} ${reason}`);
      if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });

    clientSocket.on("error", (err) => {
      console.error("[ws] Client socket error:", err.message);
      if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });
  });

  console.log(`[ws] Proxy listening on /ws → ${CONFIG.openclaw.wsUrl}`);
}
