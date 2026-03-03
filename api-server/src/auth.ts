/**
 * api-server/src/auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Express middleware that validates the bearer token sent by AiOC.
 * AiOC must include:  Authorization: Bearer <API_SERVER_SECRET>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from "express";
import { CONFIG } from "./config";

export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token || token !== CONFIG.apiSecret) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  next();
}
