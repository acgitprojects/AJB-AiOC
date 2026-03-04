/**
 * app/api/agents/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/agents          — list all registered agents
 * POST /api/agents          — register a new agent
 *
 * SPRINT 2: Dynamic agent registry
 * Replaces hard-coded AGENTS mock array with runtime agent registration.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { registerAgent, getAllAgents } from "@/lib/agent-store";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";

export interface RegisterAgentRequest {
  id: string;
  name: string;
  capabilities: string[]; // e.g., ["communicate", "schedule"]
  rules?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const agents = await getAllAgents();

    return NextResponse.json(
      { ok: true, agents, count: agents.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[agents] Failed to list agents:", err);
    return NextResponse.json(
      { error: "Failed to list agents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: RegisterAgentRequest;
  try {
    body = (await req.json()) as RegisterAgentRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.id || !body.name || !Array.isArray(body.capabilities)) {
    return NextResponse.json(
      { error: "Missing required fields: id, name, capabilities" },
      { status: 400 }
    );
  }

  // RATE LIMITING: Check if agent has exceeded rate limits
  const rateLimitCheck = await checkRateLimit(body.id);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitCheck.resetAt,
        limitType: rateLimitCheck.limitType,
      },
      {
        status: 429,
        headers: {
          "Retry-After": new Date(rateLimitCheck.resetAt).getTime().toString(),
        },
      }
    );
  }

  try {
    const agent = await registerAgent({
      id: body.id,
      name: body.name,
      capabilities: body.capabilities,
      rules: body.rules || {},
    });

    // Log the event
    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "agent_register",
      resource: "agent",
      resourceId: agent.id,
      details: { capabilities: agent.capabilities },
      status: "success",
    });

    return NextResponse.json(
      { ok: true, agent },
      { status: 201 }
    );
  } catch (err) {
    console.error("[agents] Failed to register agent:", err);

    // Log the failure
    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "agent_register",
      resource: "agent",
      resourceId: body.id,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 }
    );
  }
}
