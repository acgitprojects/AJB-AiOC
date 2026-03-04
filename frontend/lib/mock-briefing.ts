export interface BriefingSection {
  id:     string;
  title:  string;
  accent: string;
  items:  string[];
}

export interface DailyBriefing {
  date:        string;
  generatedAt: string;
  status:      "ready" | "generating" | "error";
  sections:    BriefingSection[];
}

// Empty seed — sections are populated at runtime by Jary via OpenClaw.
// When the gateway triggers a morning brief, it POSTs to /api/briefing and
// updates this structure; until then the UI shows a "Not yet generated" state.
export const MOCK_BRIEFING: DailyBriefing = {
  date:        new Date().toISOString().slice(0, 10),
  generatedAt: "--:--",
  status:      "error",
  sections: [
    { id: "email",     title: "Email Triage",    accent: "#ef4444", items: [] },
    { id: "calendar",  title: "Today's Schedule", accent: "#00d4ff", items: [] },
    { id: "tasks",     title: "Notion Tasks",    accent: "#8b5cf6", items: [] },
    { id: "news",      title: "Headlines",       accent: "#f59e0b", items: [] },
    { id: "financial", title: "Financial Pulse", accent: "#10d6a0", items: [] },
  ],
};
