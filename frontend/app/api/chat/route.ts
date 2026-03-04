/**
 * app/api/chat/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/chat
 *
 * Fire-and-forget trigger endpoint.
 * Accepts a message and forwards it to the OpenClaw agent via POST /hooks/agent.
 * Returns 202 {ok, runId} immediately — there is NO inline reply.
 * The agent reply arrives asynchronously via the WebSocket "chat.reply" event
 * which the browser receives directly from wss://gw.upnx.asia.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { sendToAgent } from "@/lib/openclaw";
import { getSession } from "@/lib/session";


export interface ChatRequest {
  message: string;
  agentId?: string;
  model?: string;
}

export interface ChatTriggerResponse {
  ok: boolean;
  runId?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatTriggerResponse>> {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { message, agentId, model } = body;

  if (!message?.trim()) {
    return NextResponse.json({ ok: false, error: "empty_message" }, { status: 400 });
  }

  const result = await sendToAgent(message, { agentId, model, name: "WebChat" });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "gateway_error" },
      { status: 502 }
    );
  }

  // Return 202 — the actual reply comes via WebSocket
  return NextResponse.json({ ok: true, runId: result.runId }, { status: 202 });
}

