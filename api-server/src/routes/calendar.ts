/**
 * api-server/src/routes/calendar.ts
 * GET /api/calendar  — fetch calendar events
 */

import { Router, Request, Response } from "express";
import { gatewayGet } from "../openclaw";

export interface CalendarEvent {
  id:          string;
  title:       string;
  start:       string;   // ISO 8601
  end:         string;   // ISO 8601
  allDay?:     boolean;
  location?:   string;
  attendees?:  string[];
  agent?:      string;
  color?:      string;
}

const today = new Date().toISOString().slice(0, 10);

const FALLBACK_CALENDAR: CalendarEvent[] = [
  { id: "c-1", title: "Morning standup",      start: `${today}T09:00:00`, end: `${today}T09:30:00`, attendees: ["Jary", "Jordan"] },
  { id: "c-2", title: "Investor call — YC",   start: `${today}T14:00:00`, end: `${today}T15:00:00`, location: "Google Meet" },
  { id: "c-3", title: "Product review",       start: `${today}T16:00:00`, end: `${today}T17:00:00`, attendees: ["Casey", "Riley"] },
];

const router = Router();

router.get("/calendar", async (_req: Request, res: Response) => {
  const live = await gatewayGet<CalendarEvent[]>("/calendar");
  res.json(live ?? FALLBACK_CALENDAR);
});

export default router;
