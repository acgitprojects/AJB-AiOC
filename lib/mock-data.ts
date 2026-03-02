// ─── Agents ─────────────────────────────────────────────────────────────────
// Status and metrics are seeded at 0; live values come from OpenClaw gateway.

export type AgentStatus = "online" | "idle" | "offline";

export const AGENTS: Array<{
  id: string;
  name: string;
  role: string;
  model: string;
  status: AgentStatus;
  skills: string[];
  tasksCompleted: number;
  responseRate: number;
  avgResponseMs: number;
  reports: string[];
  reportsTo: string | null;
}> = [
  {
    id: "jary",
    name: "Jary",
    role: "Executive Assistant",
    model: "GPT-4o",
    status: "offline",
    skills: ["scheduling", "comms", "delegation", "telegram"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: ["aria", "alex", "maya", "jordan", "morgan", "riley", "casey", "drew", "sophia"],
    reportsTo: null,
  },
  {
    id: "aria",
    name: "ARIA",
    role: "Strategic Intelligence",
    model: "Claude Sonnet",
    status: "offline",
    skills: ["market research", "competitive analysis", "planning"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "alex",
    name: "Alex",
    role: "Sales & BD",
    model: "GPT-4o",
    status: "offline",
    skills: ["CRM", "pipeline", "proposals", "Zoho CRM"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "maya",
    name: "Maya",
    role: "Marketing & Content",
    model: "GPT-4o",
    status: "offline",
    skills: ["copywriting", "social media", "campaigns", "AJC growth"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "jordan",
    name: "Jordan",
    role: "Operations & Projects",
    model: "GPT-4o",
    status: "offline",
    skills: ["Notion", "project tracking", "SOPs", "reporting"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "morgan",
    name: "Morgan",
    role: "Finance & Compliance",
    model: "o3-mini",
    status: "offline",
    skills: ["Zoho Books", "invoicing", "cashflow", "tax"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "riley",
    name: "Riley",
    role: "Customer Success",
    model: "GPT-4o",
    status: "offline",
    skills: ["helpdesk", "onboarding", "renewals", "NPS"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "casey",
    name: "Casey",
    role: "Engineering & DevOps",
    model: "o3-mini",
    status: "offline",
    skills: ["infra", "CI/CD", "BuildOS", "cloud"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "drew",
    name: "Drew",
    role: "Research & Data",
    model: "Claude Sonnet",
    status: "offline",
    skills: ["data analysis", "reporting", "benchmarking"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "sophia",
    name: "Sophia",
    role: "HR & Culture",
    model: "GPT-4o",
    status: "offline",
    skills: ["hiring", "onboarding", "culture", "docs"],
    tasksCompleted: 0,
    responseRate: 0,
    avgResponseMs: 0,
    reports: [],
    reportsTo: "jary",
  },
];

// ─── Performance chart data ──────────────────────────────────────────────────

export const PERF_WEEKLY = [
  { day: "Mon", tasks: 0, resolved: 0 },
  { day: "Tue", tasks: 0, resolved: 0 },
  { day: "Wed", tasks: 0, resolved: 0 },
  { day: "Thu", tasks: 0, resolved: 0 },
  { day: "Fri", tasks: 0, resolved: 0 },
  { day: "Sat", tasks: 0, resolved: 0 },
  { day: "Sun", tasks: 0, resolved: 0 },
];

export const PERF_MONTHLY = [
  { day: "W1", tasks: 0, resolved: 0 },
  { day: "W2", tasks: 0, resolved: 0 },
  { day: "W3", tasks: 0, resolved: 0 },
  { day: "W4", tasks: 0, resolved: 0 },
];

// ─── Calendar tasks ──────────────────────────────────────────────────────────

export type CalTask = {
  id: string;
  agent: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "done";
};

// Populated live by OpenClaw agent tasks feed.
export const CALENDAR_TASKS: Record<string, CalTask[]> = {};

// ─── Kanban board ────────────────────────────────────────────────────────────

export type KanbanTask = {
  id: string;
  title: string;
  agent: string;
  tag: string;
  status: "backlog" | "in-progress" | "review" | "done";
};

// Populated live by OpenClaw agent task feed.
export const KANBAN_TASKS: KanbanTask[] = [];

// ─── Content pipeline ────────────────────────────────────────────────────────

export type PipelineItem = {
  id: string;
  title: string;
  stage: "idea" | "drafting" | "review" | "scheduled" | "published";
  agent: string;
  product: string;
  imageUrl?: string;
};

// Populated live by OpenClaw content pipeline feed.
export const PIPELINE_ITEMS: PipelineItem[] = [];

// ─── Templates ───────────────────────────────────────────────────────────────

export type TemplateVersion = {
  version: string;
  date: string;
  author: string;
  notes: string;
};

export type Template = {
  id: string;
  name: string;
  category: string;
  type: "document" | "email" | "presentation" | "spreadsheet";
  description: string;
  versions: TemplateVersion[];
};

export const TEMPLATES: Template[] = [
  {
    id: "tmpl1",
    name: "CEO Weekly Digest",
    category: "Reporting",
    type: "document",
    description: "Monday morning summary for Andrew — KPIs, blockers, team status.",
    versions: [
      { version: "v1.3", date: "2026-03-01", author: "Jary", notes: "Added AJC subscriber metric, removed BuildOS daily counter." },
      { version: "v1.2", date: "2026-02-10", author: "Jary", notes: "Added finance section." },
      { version: "v1.1", date: "2026-01-20", author: "Jary", notes: "Initial digest structure." },
      { version: "v1.0", date: "2026-01-05", author: "Jary", notes: "First version." },
    ],
  },
  {
    id: "tmpl2",
    name: "BuildOS Enterprise Proposal",
    category: "Sales",
    type: "presentation",
    description: "Slide deck for BAS retrofit SaaS pitch to enterprise clients.",
    versions: [
      { version: "v2.1", date: "2026-02-28", author: "Alex", notes: "Updated pricing tier for HSBC deal." },
      { version: "v2.0", date: "2026-02-01", author: "Alex", notes: "Full redesign for 2026 brand." },
      { version: "v1.0", date: "2025-11-15", author: "Alex", notes: "Original deck." },
    ],
  },
  {
    id: "tmpl3",
    name: "AJC Subscriber Onboarding Email",
    category: "Marketing",
    type: "email",
    description: "Welcome sequence for new AskJary Community subscribers.",
    versions: [
      { version: "v1.2", date: "2026-02-25", author: "Maya", notes: "Added referral CTA in email 3." },
      { version: "v1.1", date: "2026-02-10", author: "Maya", notes: "Shortened subject lines." },
      { version: "v1.0", date: "2026-01-30", author: "Maya", notes: "Launch sequence." },
    ],
  },
  {
    id: "tmpl4",
    name: "Monthly Finance Report",
    category: "Finance",
    type: "spreadsheet",
    description: "P&L, cashflow, and invoice aging for monthly board review.",
    versions: [
      { version: "v3.0", date: "2026-03-01", author: "Morgan", notes: "Zoho Books auto-pull placeholder added." },
      { version: "v2.1", date: "2026-02-01", author: "Morgan", notes: "Added HKD/USD FX section." },
      { version: "v2.0", date: "2026-01-01", author: "Morgan", notes: "2026 restructure." },
    ],
  },
  {
    id: "tmpl5",
    name: "AJB Enterprise Intro Email",
    category: "Sales",
    type: "email",
    description: "Cold intro to enterprise prospects for AskJary Business pilots.",
    versions: [
      { version: "v1.1", date: "2026-03-02", author: "Alex", notes: "Personalisation tokens added." },
      { version: "v1.0", date: "2026-02-20", author: "Alex", notes: "Initial version." },
    ],
  },
  {
    id: "tmpl6",
    name: "Project Status Note",
    category: "Operations",
    type: "document",
    description: "Standard project checkpoint note for Notion operations database.",
    versions: [
      { version: "v1.0", date: "2026-01-15", author: "Jordan", notes: "First version." },
    ],
  },
];

// ─── Chat mock responses ─────────────────────────────────────────────────────

export const MOCK_RESPONSES: Record<string, string> = {
  default: "Understood, Andrew. I'll take care of that now and update you once it's done.",
  help: "I can assist with scheduling, drafting communications, delegating tasks to the team, tracking your priorities, and summarising incoming information. What do you need?",
  ajc: "**AJC Status — 3 Mar 2026**\n\n- Subscribers: 34 (target: 100 by end March)\n- Trial conversion rate: 41%\n- Top acquisition: organic Telegram\n- Maya's onboarding email sequence is live\n\nPace is behind target. Maya recommends a LinkedIn push this week. [ACTION REQUIRED] Approve campaign?",
  digest: "**CEO Digest — Mon 3 Mar 2026**\n\n**🔴 High Priority**\n- AJC at 34/100 subscribers — 3 weeks left\n- HSBC BuildOS proposal: Alex submitting revised deck today\n\n**🟡 Watch**\n- Morgan flagged 2 overdue invoices (>30 days)\n- Casey: gateway NVM warning cleared ✅\n\n**🟢 Done This Week**\n- Notion databases connected (7 DBs)\n- USER.md deployed — Jary now knows you by name",
};
