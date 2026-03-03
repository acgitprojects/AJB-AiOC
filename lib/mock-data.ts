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

// ─── My Tasks (agent-created todos for the user) ─────────────────────────────

export type TaskAssignee = {
  type: "agent" | "human";
  id: string;
  name: string;
};

export type MyTask = {
  id: string;
  title: string;
  description?: string;
  createdByAgent: string; // agent id
  assignee: TaskAssignee;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "done" | "delegated";
  createdAt: string;     // ISO date string
  dueDate?: string;      // ISO date string
  tags: string[];
  updatedAt?: string;    // Updated for task delegation tracking
  delegations?: Array<{  // Track delegation history for multi-agent workflows
    from: string;
    to: string;
    proposedAt: string;
    acceptedAt?: string;
    reason?: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
  }>;
};

export const MY_TASKS: MyTask[] = [
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
