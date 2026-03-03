/**
 * api-server/src/routes/briefing.ts
 * GET  /api/briefing  — fetch latest daily briefing
 * POST /api/briefing  — trigger Jary to generate a new briefing
 */

import { Router, Request, Response } from "express";
import { gatewayGet, sendToAgent } from "../openclaw";

export interface BriefingSection {
  title:   string;
  items:   string[];
  type?:   string;
}

export interface DailyBriefing {
  date:         string;
  generatedAt:  string;
  status:       "ready" | "generating" | "error";
  greeting?:    string;
  sections:     BriefingSection[];
}

const FALLBACK_BRIEFING: DailyBriefing = {
  date:        new Date().toISOString().slice(0, 10),
  generatedAt: "--:--",
  status:      "ready",
  greeting:    "Gateway offline — showing cached briefing.",
  sections: [
    { title: "Email Triage",      items: ["No live data — gateway offline."], type: "email" },
    { title: "Today's Schedule",  items: ["Connect gateway to see schedule."],  type: "calendar" },
    { title: "Pending Tasks",     items: ["Connect gateway to see tasks."],     type: "tasks" },
  ],
};

const router = Router();

router.get("/briefing", async (_req: Request, res: Response) => {
  const live = await gatewayGet<DailyBriefing>("/briefing");
  res.json(live ?? FALLBACK_BRIEFING);
});

router.post("/briefing", async (_req: Request, res: Response) => {
  const result = await sendToAgent(
    "Generate my daily briefing now. Include: email triage, today's schedule, pending Notion tasks, key headlines, and financial pulse. Format each section clearly.",
    { agentId: "jary", name: "DailyBriefingTrigger", wakeMode: "now" }
  );

  if (!result.ok) {
    res.status(502).json({
      ok:     false,
      error:  result.error ?? "gateway_error",
      briefing: { ...FALLBACK_BRIEFING, status: "error" as const },
    });
    return;
  }

  // Triggered — agent runs async, reply arrives via WebSocket
  const generating: DailyBriefing = {
    ...FALLBACK_BRIEFING,
    status:      "generating",
    generatedAt: new Date().toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit", hour12: false }),
    greeting:    "Generating your briefing…",
  };

  res.json({ ok: true, runId: result.runId, briefing: generating });
});

export default router;
