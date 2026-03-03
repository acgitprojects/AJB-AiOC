/**
 * api-server/src/config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised, validated configuration from environment variables.
 * Fail-fast on startup if required values are missing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as dotenv from "dotenv";
dotenv.config();

function require_env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}

export const CONFIG = {
  // ── Server ────────────────────────────────────────────────────────────────
  port:      parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv:   process.env.NODE_ENV ?? "development",

  // Token that AiOC presents in Authorization: Bearer <token>
  apiSecret: require_env("API_SERVER_SECRET"),

  // CORS — comma-separated list of allowed origins
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),

  // ── OpenClaw gateway ──────────────────────────────────────────────────────
  openclaw: {
    gatewayUrl:     require_env("OPENCLAW_GATEWAY_URL", "http://localhost:18789"),
    wsUrl:          require_env("OPENCLAW_WS_URL",      "ws://localhost:18789"),
    hooksToken:     require_env("OPENCLAW_HOOKS_TOKEN"),
    wsToken:        require_env("OPENCLAW_WS_TOKEN"),
    defaultAgentId: process.env.OPENCLAW_DEFAULT_AGENT_ID ?? "jary",
  },
} as const;
