/**
 * api-server/src/routes/health.ts
 * GET /healthz  — server & gateway health combined
 */

import { Router } from "express";
import { getGatewayStatus } from "../openclaw";
import { CONFIG } from "../config";

const router = Router();

router.get("/healthz", async (_req, res) => {
  const gateway = await getGatewayStatus();
  res.json({
    ok:         true,
    server:     "aioc-api-server",
    version:    "1.0.0",
    nodeEnv:    CONFIG.nodeEnv,
    uptime:     process.uptime(),
    gateway: {
      connected: gateway.ok,
      url:       CONFIG.openclaw.gatewayUrl,
      version:   gateway.version,
      uptime:    gateway.uptime,
      channels:  gateway.channels,
      agents:    gateway.agents,
      error:     gateway.error,
    },
    checkedAt: new Date().toISOString(),
  });
});

export default router;
