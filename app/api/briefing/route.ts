import { NextResponse } from "next/server";
import { MOCK_BRIEFING, type DailyBriefing } from "@/lib/mock-briefing";

export async function GET() {
  return NextResponse.json(MOCK_BRIEFING);
}

export async function POST() {
  // Simulate a 1.5 s regeneration delay
  await new Promise(r => setTimeout(r, 1500));

  const refreshed: DailyBriefing = {
    ...MOCK_BRIEFING,
    generatedAt: new Date().toLocaleTimeString("en-HK", {
      hour:   "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    status: "ready",
  };

  return NextResponse.json(refreshed);
}
