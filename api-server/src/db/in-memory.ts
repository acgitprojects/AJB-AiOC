import type { KanbanTask, PipelineItem, CalendarData, DailyBriefing } from "@ajb/contract";

export const board: KanbanTask[] = [];

export const pipeline: PipelineItem[] = [];

export const calendar: CalendarData = {};

export const briefing: DailyBriefing = {
  date: new Date().toISOString().slice(0, 10),
  generatedAt: "--:--",
  status: "error",
  sections: [
    { id: "email", title: "Email Triage", accent: "#ef4444", items: [] },
    { id: "calendar", title: "Today's Schedule", accent: "#00d4ff", items: [] },
    { id: "tasks", title: "Notion Tasks", accent: "#8b5cf6", items: [] },
    { id: "news", title: "Headlines", accent: "#f59e0b", items: [] },
    { id: "financial", title: "Financial Pulse", accent: "#10d6a0", items: [] },
  ],
};
