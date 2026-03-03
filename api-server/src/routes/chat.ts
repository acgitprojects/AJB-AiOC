/**
 * api-server/src/routes/chat.ts
 * POST /api/chat  — fire-and-forget agent trigger
 *
 * Accepts a message from AiOC, forwards to OpenClaw agent via hooks API.
 * Returns 202 immediately — the actual reply arrives via WebSocket.
 */

import { Router, Request, Response } from "express";
import { sendToAgent } from "../openclaw";

interface ChatRequest {
  message:  string;
  agentId?: string;
  model?:   string;
}

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const body = req.body as Partial<ChatRequest>;

  if (!body.message?.trim()) {
    res.status(400).json({ ok: false, error: "empty_message" });
    return;
  }

  const result = await sendToAgent(body.message, {
    agentId: body.agentId,
    model:   body.model,
    name:    "WebChat",
  });

  if (!result.ok) {
    res.status(502).json({ ok: false, error: result.error ?? "gateway_error" });
    return;
  }

  // 202 Accepted — real reply arrives via WebSocket "chat.reply" event
  res.status(202).json({ ok: true, runId: result.runId });
});

export default router;
