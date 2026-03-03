import { NextResponse } from "next/server";
import { MOCK_BRIEFING, type DailyBriefing } from "@/lib/mock-briefing";
import { sendToAgent, OPENCLAW_CONFIG } from "@/lib/openclaw";


export async function GET() {
  // Try to fetch a live briefing pushed by Jary to the gateway.
  try {
    const res = await fetch(`${OPENCLAW_CONFIG.gatewayUrl}/briefing`, {
      headers: {
        Authorization: `Bearer ${OPENCLAW_CONFIG.hooksToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as DailyBriefing;
      return NextResponse.json(data);
    }
  } catch {
    // Gateway unreachable — fall through to mock
  }

  return NextResponse.json(MOCK_BRIEFING);
}

export async function POST() {
  // Send a "generate daily briefing" request to Jary via the OpenClaw agent hook.
  // The agent runs async; its reply arrives via WebSocket on the client side.
  // This endpoint returns immediately with status: "generating".
  const result = await sendToAgent(
    "Generate my daily briefing now. Include: email triage, today's schedule, pending Notion tasks, key headlines, and financial pulse. Format each section clearly.",
    {
      agentId:   "jary",
      name:      "DailyBriefingTrigger",
      wakeMode:  "now",
    }
  );

  if (!result.ok) {
    // Gateway unavailable — return mock with generating status so UI can show something
    return NextResponse.json(
      { ...MOCK_BRIEFING, status: "error" as const, generatedAt: "--:--" },
      { status: 502 }
    );
  }

  const generating: DailyBriefing = {
    ...MOCK_BRIEFING,
    status: "generating",
    generatedAt: new Date().toLocaleTimeString("en-HK", {
      hour:   "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };

  return NextResponse.json(generating);
}
