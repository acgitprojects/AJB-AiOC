// ─── Agents ─────────────────────────────────────────────────────────────────

export const AGENTS = [
  {
    id: "jary",
    name: "Jary",
    role: "Executive Assistant",
    model: "GPT-4o",
    status: "online" as const,
    skills: ["scheduling", "comms", "delegation", "telegram"],
    tasksCompleted: 142,
    responseRate: 98,
    avgResponseMs: 1200,
    reports: ["aria", "alex", "maya", "jordan", "morgan", "riley", "casey", "drew", "sophia"],
    reportsTo: null,
  },
  {
    id: "aria",
    name: "ARIA",
    role: "Strategic Intelligence",
    model: "Claude Sonnet",
    status: "online" as const,
    skills: ["market research", "competitive analysis", "planning"],
    tasksCompleted: 87,
    responseRate: 95,
    avgResponseMs: 2100,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "alex",
    name: "Alex",
    role: "Sales & BD",
    model: "GPT-4o",
    status: "online" as const,
    skills: ["CRM", "pipeline", "proposals", "Zoho CRM"],
    tasksCompleted: 63,
    responseRate: 92,
    avgResponseMs: 1800,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "maya",
    name: "Maya",
    role: "Marketing & Content",
    model: "GPT-4o",
    status: "online" as const,
    skills: ["copywriting", "social media", "campaigns", "AJC growth"],
    tasksCompleted: 109,
    responseRate: 97,
    avgResponseMs: 1500,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "jordan",
    name: "Jordan",
    role: "Operations & Projects",
    model: "GPT-4o",
    status: "idle" as const,
    skills: ["Notion", "project tracking", "SOPs", "reporting"],
    tasksCompleted: 54,
    responseRate: 88,
    avgResponseMs: 2400,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "morgan",
    name: "Morgan",
    role: "Finance & Compliance",
    model: "o3-mini",
    status: "online" as const,
    skills: ["Zoho Books", "invoicing", "cashflow", "tax"],
    tasksCompleted: 38,
    responseRate: 99,
    avgResponseMs: 3200,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "riley",
    name: "Riley",
    role: "Customer Success",
    model: "GPT-4o",
    status: "online" as const,
    skills: ["helpdesk", "onboarding", "renewals", "NPS"],
    tasksCompleted: 76,
    responseRate: 94,
    avgResponseMs: 1600,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "casey",
    name: "Casey",
    role: "Engineering & DevOps",
    model: "o3-mini",
    status: "idle" as const,
    skills: ["infra", "CI/CD", "BuildOS", "cloud"],
    tasksCompleted: 45,
    responseRate: 91,
    avgResponseMs: 2800,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "drew",
    name: "Drew",
    role: "Research & Data",
    model: "Claude Sonnet",
    status: "online" as const,
    skills: ["data analysis", "reporting", "benchmarking"],
    tasksCompleted: 61,
    responseRate: 93,
    avgResponseMs: 2200,
    reports: [],
    reportsTo: "jary",
  },
  {
    id: "sophia",
    name: "Sophia",
    role: "HR & Culture",
    model: "GPT-4o",
    status: "offline" as const,
    skills: ["hiring", "onboarding", "culture", "docs"],
    tasksCompleted: 29,
    responseRate: 85,
    avgResponseMs: 1900,
    reports: [],
    reportsTo: "jary",
  },
];

// ─── Performance chart data ──────────────────────────────────────────────────

export const PERF_WEEKLY = [
  { day: "Mon", tasks: 18, resolved: 15 },
  { day: "Tue", tasks: 24, resolved: 22 },
  { day: "Wed", tasks: 31, resolved: 27 },
  { day: "Thu", tasks: 20, resolved: 19 },
  { day: "Fri", tasks: 28, resolved: 25 },
  { day: "Sat", tasks: 9,  resolved: 9 },
  { day: "Sun", tasks: 5,  resolved: 5 },
];

export const PERF_MONTHLY = [
  { day: "W1", tasks: 82, resolved: 74 },
  { day: "W2", tasks: 91, resolved: 85 },
  { day: "W3", tasks: 78, resolved: 70 },
  { day: "W4", tasks: 104, resolved: 97 },
];

// ─── Calendar tasks ──────────────────────────────────────────────────────────

export type CalTask = {
  id: string;
  agent: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "done";
};

export const CALENDAR_TASKS: Record<string, CalTask[]> = {
  "2026-03-03": [
    { id: "t1", agent: "Jary", title: "Send Monday CEO Digest", priority: "high", status: "done" },
    { id: "t2", agent: "Maya", title: "Draft AJC launch email campaign", priority: "high", status: "in-progress" },
    { id: "t3", agent: "Alex", title: "Update HSBC BuildOS proposal", priority: "high", status: "pending" },
  ],
  "2026-03-04": [
    { id: "t4", agent: "Morgan", title: "Generate Feb P&L summary", priority: "medium", status: "pending" },
    { id: "t5", agent: "Riley", title: "Follow up AJC trial users (Day 3)", priority: "high", status: "pending" },
    { id: "t6", agent: "Jordan", title: "Update Notion project milestones", priority: "low", status: "pending" },
  ],
  "2026-03-05": [
    { id: "t7", agent: "ARIA", title: "Competitive scan — AJB Q1 market", priority: "medium", status: "pending" },
    { id: "t8", agent: "Casey", title: "BuildOS staging deploy", priority: "high", status: "pending" },
  ],
  "2026-03-06": [
    { id: "t9", agent: "Drew", title: "AJC subscriber growth report", priority: "medium", status: "pending" },
    { id: "t10", agent: "Alex", title: "AJB enterprise intro emails — batch 1", priority: "high", status: "pending" },
  ],
  "2026-03-10": [
    { id: "t11", agent: "Jary", title: "Weekly CEO Digest — 10 Mar", priority: "high", status: "pending" },
    { id: "t12", agent: "Morgan", title: "Invoice follow-up — overdue > 14 days", priority: "high", status: "pending" },
  ],
  "2026-03-17": [
    { id: "t13", agent: "Jary", title: "Weekly CEO Digest — 17 Mar", priority: "high", status: "pending" },
    { id: "t14", agent: "ARIA", title: "AJC mid-March growth review", priority: "medium", status: "pending" },
  ],
};

// ─── Kanban board ────────────────────────────────────────────────────────────

export type KanbanTask = {
  id: string;
  title: string;
  agent: string;
  tag: string;
  status: "backlog" | "in-progress" | "review" | "done";
};

export const KANBAN_TASKS: KanbanTask[] = [
  { id: "k1",  title: "AJC subscriber onboarding sequence",    agent: "Maya",   tag: "AJC",      status: "in-progress" },
  { id: "k2",  title: "BuildOS HSBC deck final revision",       agent: "Alex",   tag: "BuildOS",  status: "in-progress" },
  { id: "k3",  title: "Q1 cashflow projection",                 agent: "Morgan", tag: "Finance",  status: "review" },
  { id: "k4",  title: "AJB enterprise contact list",           agent: "Alex",   tag: "AJB",      status: "backlog" },
  { id: "k5",  title: "Social posts — AJC beta week 2",        agent: "Maya",   tag: "AJC",      status: "in-progress" },
  { id: "k6",  title: "OpenClaw gateway health report",        agent: "Casey",  tag: "Infra",    status: "done" },
  { id: "k7",  title: "Notion helpdesk board audit",           agent: "Jordan", tag: "Ops",      status: "backlog" },
  { id: "k8",  title: "Renewal risk report — Mar cohort",      agent: "Riley",  tag: "CS",       status: "review" },
  { id: "k9",  title: "Competitive teardown — Glassix",        agent: "ARIA",   tag: "Research", status: "backlog" },
  { id: "k10", title: "SEA market sizing — AJB",               agent: "Drew",   tag: "Research", status: "backlog" },
  { id: "k11", title: "Staff handbook v1",                     agent: "Sophia", tag: "HR",       status: "backlog" },
  { id: "k12", title: "BuildOS staging release notes",         agent: "Casey",  tag: "Infra",    status: "done" },
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

export const PIPELINE_ITEMS: PipelineItem[] = [
  { id: "p1",  title: "AJC launch announcement — LinkedIn",         stage: "scheduled",  agent: "Maya",  product: "AJC",     imageUrl: "https://placehold.co/400x200/4f46e5/ffffff?text=AJC+Launch" },
  { id: "p2",  title: "AJC beta user success story",               stage: "drafting",   agent: "Maya",  product: "AJC" },
  { id: "p3",  title: "BuildOS ROI case study — manufacturing",    stage: "review",     agent: "Alex",  product: "BuildOS", imageUrl: "https://placehold.co/400x200/0f172a/ffffff?text=BuildOS+ROI" },
  { id: "p4",  title: "AJB enterprise intro deck",                 stage: "drafting",   agent: "Alex",  product: "AJB" },
  { id: "p5",  title: "CEO newsletter — March product update",     stage: "idea",       agent: "Jary",  product: "General" },
  { id: "p6",  title: "AJC feature explainer video script",        stage: "idea",       agent: "Maya",  product: "AJC" },
  { id: "p7",  title: "UPNX HVAC case study — HSBC building",      stage: "published",  agent: "Alex",  product: "BuildOS", imageUrl: "https://placehold.co/400x200/166534/ffffff?text=Published" },
];

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
