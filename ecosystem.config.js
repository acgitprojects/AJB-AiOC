/**
 * ecosystem.config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * PM2 process configuration for the OpenClaw Operations Centre.
 *
 * Deploy to Tencent CVM:
 *   git pull && npm ci --omit=dev && npm run build
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save && pm2 startup
 *
 * Note: Fill in the real token/password values before running.
 *       Do NOT commit this file with real secrets — use PM2 env or .env.local.
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = {
  apps: [
    {
      name:        "aioc",
      script:      "node_modules/.bin/next",
      args:        "start -p 3000",
      cwd:         __dirname,
      instances:   1,
      autorestart: true,
      watch:       false,
      max_memory_restart: "512M",

      env_production: {
        NODE_ENV: "production",

        // ── OpenClaw Gateway ─────────────────────────────────────────────────
        // On the same VM: talk to OpenClaw over loopback (faster, no TLS)
        OPENCLAW_GATEWAY_URL: "http://127.0.0.1:18789",
        OPENCLAW_WS_URL:      "ws://127.0.0.1:18789",

        // HTTP hooks token — matches openclaw.json → hooks.token
        OPENCLAW_HOOKS_TOKEN: "REPLACE_WITH_HOOKS_TOKEN",

        // WS token — matches openclaw.json → gateway.auth.token
        OPENCLAW_WS_TOKEN:    "REPLACE_WITH_WS_TOKEN",

        // ── NEXT_PUBLIC (passed to browser build) ────────────────────────────
        // Browser connects to the public subdomain over Cloudflare.
        NEXT_PUBLIC_OPENCLAW_WS_URL:   "wss://gw.upnx.asia",
        NEXT_PUBLIC_OPENCLAW_WS_TOKEN: "REPLACE_WITH_WS_TOKEN",

        // ── Agent defaults ───────────────────────────────────────────────────
        OPENCLAW_DEFAULT_AGENT_ID: "hooks",
        OPENCLAW_SESSION_PREFIX:   "webchat",

        // ── Dashboard auth ───────────────────────────────────────────────────
        DASHBOARD_PASSWORD:       "REPLACE_WITH_DASHBOARD_PASSWORD",
        DASHBOARD_SESSION_SECRET: "REPLACE_WITH_SESSION_SECRET",
      },
    },
  ],
};
