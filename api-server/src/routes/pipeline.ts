/**
 * api-server/src/routes/pipeline.ts
 * GET /api/pipeline  — content pipeline items
 */

import { Router, Request, Response } from "express";
import { gatewayGet } from "../openclaw";

export interface PipelineItem {
  id:          string;
  title:       string;
  type:        "blog" | "video" | "social" | "email" | "document";
  status:      "idea" | "drafting" | "review" | "scheduled" | "published";
  agent?:      string;
  dueDate?:    string;
  platform?:   string;
}

const FALLBACK_PIPELINE: PipelineItem[] = [
  { id: "pi-1", title: "AI in Operations — Blog Post",    type: "blog",     status: "drafting",  agent: "maya",  dueDate: "2026-03-06" },
  { id: "pi-2", title: "Founder Q&A — Twitter thread",    type: "social",   status: "scheduled", agent: "maya",  dueDate: "2026-03-04", platform: "Twitter/X" },
  { id: "pi-3", title: "Investor update newsletter",      type: "email",    status: "review",    agent: "jary",  dueDate: "2026-03-07" },
  { id: "pi-4", title: "Product demo video walkthrough",  type: "video",    status: "idea",      agent: "riley" },
  { id: "pi-5", title: "Q1 strategy doc",                 type: "document", status: "published", agent: "aria" },
];

const router = Router();

router.get("/pipeline", async (_req: Request, res: Response) => {
  const live = await gatewayGet<PipelineItem[]>("/pipeline");
  res.json(live ?? FALLBACK_PIPELINE);
});

export default router;
