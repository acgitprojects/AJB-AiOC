import { sql } from "./client";
import * as taskRepo from "../repositories/task.repository";
import { insertUserWithPassword } from "../repositories/user.repository";
import { hashPassword } from "../services/password";
import type { MyTask } from "@ajb/contract";

const TASKS: MyTask[] = [
  {
    id: "task-001",
    title: "Approve AJC LinkedIn campaign brief",
    description: "Maya has drafted a LinkedIn push campaign targeting 500 new AJC subscribers by end of March. Review and approve creative brief.",
    createdByAgent: "maya",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "high",
    status: "pending",
    createdAt: "2026-03-03T08:00:00Z",
    dueDate: "2026-03-04T18:00:00Z",
    tags: ["AJC", "Marketing"],
  },
  {
    id: "task-002",
    title: "Review revised HSBC BuildOS proposal deck",
    description: "Alex has updated the enterprise proposal with revised pricing tiers for the HSBC deal. Final sign-off needed before submission.",
    createdByAgent: "alex",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "high",
    status: "pending",
    createdAt: "2026-03-03T08:15:00Z",
    dueDate: "2026-03-03T17:00:00Z",
    tags: ["BuildOS", "Sales"],
  },
  {
    id: "task-003",
    title: "Respond to 2 overdue invoice clients",
    description: "Morgan has flagged two invoices over 30 days outstanding. Client names and amounts are in the finance report. A follow-up email is needed.",
    createdByAgent: "morgan",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "high",
    status: "in-progress",
    createdAt: "2026-03-03T08:20:00Z",
    dueDate: "2026-03-05T18:00:00Z",
    tags: ["Finance", "Invoices"],
  },
  {
    id: "task-004",
    title: "Sign off CEO Weekly Digest v1.3",
    description: "Jary has finalised this week's digest including AJC subscriber metric. Approve before it is distributed to the board.",
    createdByAgent: "jary",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "medium",
    status: "done",
    createdAt: "2026-03-03T07:00:00Z",
    dueDate: "2026-03-03T09:00:00Z",
    tags: ["Reporting"],
  },
  {
    id: "task-005",
    title: "Confirm Q1 board meeting date",
    description: "Jordan needs a confirmed date to block calendars and distribute pre-read materials at least 5 days prior.",
    createdByAgent: "jordan",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "medium",
    status: "pending",
    createdAt: "2026-03-03T09:00:00Z",
    dueDate: "2026-03-07T18:00:00Z",
    tags: ["Operations", "Calendar"],
  },
  {
    id: "task-006",
    title: "Record AJC welcome video intro",
    description: "Maya recommends a short 60-second founder intro video for the subscriber onboarding sequence. Script is ready.",
    createdByAgent: "maya",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "medium",
    status: "pending",
    createdAt: "2026-03-03T09:30:00Z",
    dueDate: "2026-03-10T18:00:00Z",
    tags: ["AJC", "Content"],
  },
  {
    id: "task-007",
    title: "Review BuildOS beta tester NPS responses",
    description: "Riley has compiled 12 NPS survey responses from BuildOS beta users. Themes have been extracted — your input needed on roadmap prioritisation.",
    createdByAgent: "riley",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "medium",
    status: "in-progress",
    createdAt: "2026-03-02T15:00:00Z",
    dueDate: "2026-03-06T18:00:00Z",
    tags: ["BuildOS", "Customer Success"],
  },
  {
    id: "task-008",
    title: "Delegate competitive analysis to ARIA",
    description: "Drew flagged three new AI operations competitors launched this month. ARIA can run a full competitive analysis — confirm scope and assign.",
    createdByAgent: "drew",
    assignee: { type: "agent", id: "aria", name: "ARIA" },
    priority: "medium",
    status: "pending",
    createdAt: "2026-03-03T10:00:00Z",
    dueDate: "2026-03-07T18:00:00Z",
    tags: ["Intelligence", "Research"],
  },
  {
    id: "task-009",
    title: "Approve new DevOps runbook for BuildOS infra",
    description: "Casey has documented the new deployment runbook. A quick review for any business-risk items before it goes live.",
    createdByAgent: "casey",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "low",
    status: "pending",
    createdAt: "2026-03-02T14:00:00Z",
    dueDate: "2026-03-10T18:00:00Z",
    tags: ["BuildOS", "Engineering"],
  },
  {
    id: "task-010",
    title: "Interview shortlist: Head of Partnerships",
    description: "Sophia has screened 6 applicants and shortlisted 2. Confirm interview slots so calendar invites can be sent.",
    createdByAgent: "sophia",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "low",
    status: "pending",
    createdAt: "2026-03-02T11:00:00Z",
    dueDate: "2026-03-12T18:00:00Z",
    tags: ["HR", "Hiring"],
  },
  {
    id: "task-011",
    title: "Provide quote for AJC case study",
    description: "Maya's content team is publishing a case study on AJC growth. A two-sentence founder quote is needed by EOW.",
    createdByAgent: "maya",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "low",
    status: "done",
    createdAt: "2026-03-01T09:00:00Z",
    dueDate: "2026-03-03T18:00:00Z",
    tags: ["AJC", "Content"],
  },
  {
    id: "task-012",
    title: "Review market entry memo — Southeast Asia",
    description: "ARIA has completed the Southeast Asia market opportunity brief. 8-page memo with recommendation to proceed with SG pilot.",
    createdByAgent: "aria",
    assignee: { type: "human", id: "andrew", name: "Andrew (Me)" },
    priority: "medium",
    status: "in-progress",
    createdAt: "2026-03-03T11:00:00Z",
    dueDate: "2026-03-08T18:00:00Z",
    tags: ["Strategy", "Intelligence"],
  },
];

export async function seedIfEmpty(): Promise<void> {
  const [{ count }] = await sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM tasks`;
  if (Number(count) > 0) return;

  console.log("Seeding database with initial data...");

  await taskRepo.insertMany(TASKS);

  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const hash = await hashPassword(adminPassword);
  await insertUserWithPassword(
    {
      id: "admin-1",
      email: "admin@ajb.com",
      name: "Andrew",
      role: "admin",
      alertsEnabled: false,
    },
    hash,
  );

  console.log("Seed complete.");
}

/** Wipe all data and re-seed from scratch. Used by the test reset endpoint. */
export async function resetAndReseed(): Promise<void> {
  await sql`TRUNCATE task_delegations, tasks, user_passwords, users RESTART IDENTITY CASCADE`;
  await taskRepo.insertMany(TASKS);

  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
  const hash = await hashPassword(adminPassword);
  await insertUserWithPassword(
    {
      id: "admin-1",
      email: "admin@ajb.com",
      name: "Andrew",
      role: "admin",
      alertsEnabled: false,
    },
    hash,
  );
}
