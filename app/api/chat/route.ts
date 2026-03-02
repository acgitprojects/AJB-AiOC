/**
 * app/api/chat/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/chat
 *
 * Proxies a chat message from the browser to the OpenClaw gateway's
 * POST /hooks/agent endpoint.
 *
 * Falls back to mock responses (from lib/mock-data.ts) when the gateway is
 * unreachable, so the UI always works in development.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { sendToAgent } from "@/lib/openclaw";
import { MOCK_RESPONSES } from "@/lib/mock-data";

export interface ChatRequest {
  message: string;
  agentId?: string;
  sessionKey?: string;
  model?: string;
}

export interface ChatResponse {
  reply: string;
  agentId?: string;
  sessionKey?: string;
  elapsedMs?: number;
  source: "openclaw" | "mock";
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json(
      { reply: "Invalid request body.", source: "mock", error: "bad_json" },
      { status: 400 }
    );
  }

  const { message, agentId, sessionKey, model } = body;

  if (!message?.trim()) {
    return NextResponse.json(
      { reply: "Message is required.", source: "mock", error: "empty_message" },
      { status: 400 }
    );
  }

  // ── Try OpenClaw gateway ──────────────────────────────────────────────────
  const result = await sendToAgent(message, {
    agentId,
    sessionKey,
    model,
    name: "WebChat",
  });

  if (result.ok && result.reply) {
    return NextResponse.json({
      reply:      result.reply,
      agentId:    result.agentId,
      sessionKey: result.sessionKey,
      elapsedMs:  result.elapsedMs,
      source:     "openclaw",
    });
  }

  // ── Fallback: mock responses ──────────────────────────────────────────────
  const lower = message.toLowerCase();
  const key =
    lower.includes("ajc")    ? "ajc"    :
    lower.includes("digest") ? "digest" :
    lower.includes("help")   ? "help"   :
    "default";

  return NextResponse.json({
    reply:  MOCK_RESPONSES[key],
    source: "mock",
    error:  result.error,
  });
}
