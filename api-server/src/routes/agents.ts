/**
 * api-server/src/routes/agents.ts
 * GET /api/agents  — agent roster with live status from the OpenClaw gateway
 */

import { Router } from "express";
import { getGatewayStatus } from "../openclaw";

// Static agent definitions (mirrors lib/mock-data.ts in AiOC)
const AGENT_DEFINITIONS = [
  { id: "jary",   name: "Jary",   role: "Executive Assistant",      model: "openai/gpt-4o",                avatar: "J" },
  { id: "aria",   name: "ARIA",   role: "Strategic Intelligence",   model: "anthropic/claude-sonnet-4-5", avatar: "A" },
  { id: "alex",   name: "Alex",   role: "Sales & BD",               model: "openai/gpt-4o",                avatar: "Ax" },
  { id: "maya",   name: "Maya",   role: "Marketing & Content",      model: "openai/gpt-4o",                avatar: "M" },
  { id: "jordan", name: "Jordan", role: "Operations & Projects",    model: "openai/gpt-4o",                avatar: "Jo" },
  { id: "morgan", name: "Morgan", role: "Finance & Compliance",     model: "openai/o3-mini",               avatar: "Mo" },
  { id: "riley",  name: "Riley",  role: "Customer Success",         model: "openai/gpt-4o",                avatar: "R" },
  { id: "casey",  name: "Casey",  role: "Engineering & DevOps",     model: "openai/o3-mini",               avatar: "C" },
  { id: "drew",   name: "Drew",   role: "Research & Data",          model: "anthropic/claude-sonnet-4-5", avatar: "D" },
  { id: "sophia", name: "Sophia", role: "HR & Culture",             model: "openai/gpt-4o",                avatar: "S" },
];

const router = Router();

router.get("/agents", async (_req, res) => {
  const status = await getGatewayStatus();

  const agents = AGENT_DEFINITIONS.map(a => ({
    ...a,
    status: status.ok ? "online" : "offline",
  }));

  res.json(agents);
});

export default router;
