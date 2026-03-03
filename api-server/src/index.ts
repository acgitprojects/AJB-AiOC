/**
 * api-server/src/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AiOC ↔ OpenClaw integration API server
 *
 * Architecture:
 *   Browser / AiOC (Cloudflare Workers or Instance A)
 *       │
 *       │  HTTPS + WSS (bearer token: API_SERVER_SECRET)
 *       ▼
 *   API Server  ←— YOU ARE HERE (Instance B, Tencent Cloud)
 *       │
 *       │  HTTP + WS (bearer token: OPENCLAW_HOOKS_TOKEN / OPENCLAW_WS_TOKEN)
 *       ▼
 *   OpenClaw Gateway (Instance A, same VM as AiOC, port 18789)
 *       │
 *       ▼
 *   AI Agents (Jary, ARIA, Maya, …)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import rateLimit from "express-rate-limit";

import { CONFIG } from "./config";
import { bearerAuth } from "./auth";
import { attachWebSocketProxy } from "./ws";

// ── Route handlers ────────────────────────────────────────────────────────────
import healthRouter    from "./routes/health";
import agentsRouter    from "./routes/agents";
import boardRouter     from "./routes/board";
import tasksRouter     from "./routes/tasks";
import briefingRouter  from "./routes/briefing";
import calendarRouter  from "./routes/calendar";
import pipelineRouter  from "./routes/pipeline";
import chatRouter      from "./routes/chat";
import dashboardRouter from "./routes/dashboard";

// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────

app.set("trust proxy", 1); // Nginx reverse-proxy on the same instance

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return cb(null, true);
    if (CONFIG.corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

// Rate-limit all API calls (generous for internal use)
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max:      300,
    message:  { ok: false, error: "rate_limit_exceeded" },
    standardHeaders: true,
    legacyHeaders:   false,
  })
);

// ── Public routes (no auth) ───────────────────────────────────────────────────
app.use(healthRouter);

// ── Protected API routes — two path prefixes ──────────────────────────────────
//
//   /api/*   ← used by AiOC when calling this server as the API layer
//   /*       ← OpenClaw-compatible paths; lets AiOC use OPENCLAW_GATEWAY_URL
//              pointing directly at this server without code changes
//
// Both prefixes require the same bearer token (API_SERVER_SECRET).

const protectedRouters = [
  agentsRouter,
  boardRouter,
  tasksRouter,
  briefingRouter,
  calendarRouter,
  pipelineRouter,
  chatRouter,
  dashboardRouter,
];

for (const r of protectedRouters) {
  app.use("/api", bearerAuth, r);  // explicit /api prefix
  app.use("/",    bearerAuth, r);  // root-level (OpenClaw-compatible)
}

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "not_found" });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const httpServer = createServer(app);

// Attach the WebSocket proxy (/ws path — handles AiOC live chat)
attachWebSocketProxy(httpServer);

httpServer.listen(CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         AiOC API Server  v1.0.0                      ║
╠══════════════════════════════════════════════════════╣
║  HTTP   → http://0.0.0.0:${CONFIG.port}                       ║
║  WS     → ws://0.0.0.0:${CONFIG.port}/ws                     ║
║  Target → ${CONFIG.openclaw.gatewayUrl.padEnd(40)} ║
║  Env    → ${CONFIG.nodeEnv.padEnd(40)} ║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
