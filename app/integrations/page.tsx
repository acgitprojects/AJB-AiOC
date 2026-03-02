"use client";

import { useState } from "react";
import { CheckCircle2, Clock4, MessageSquare, ExternalLink, Info } from "lucide-react";

// ── data ──────────────────────────────────────────────────────────────────────

const IM_TOOLS = [
  {
    id: "telegram",
    name: "Telegram",
    description: "Primary channel for Andrew ↔ Jary communication. Bot is live.",
    status: "connected" as const,
    sso: false,
    details: "Bot: @JaryAIBot · Gateway: 127.0.0.1:18789 · Channel binding: jary",
    color: "bg-sky-500",
    initial: "TG",
  },
  {
    id: "slack",
    name: "Slack",
    description: "SSO via Okta. Channel routing to agents via slash commands.",
    status: "roadmap" as const,
    sso: true,
    details: "Planned: /jary command, #ops-alerts channel binding",
    color: "bg-violet-600",
    initial: "SL",
  },
  {
    id: "wecom",
    name: "WeCom",
    description: "Enterprise WeChat for SEA client communications.",
    status: "roadmap" as const,
    sso: true,
    details: "Planned: webhook bridge to OpenClaw gateway",
    color: "bg-emerald-600",
    initial: "WC",
  },
];

const INTEGRATIONS = [
  {
    id: "buildos",
    name: "BuildOS",
    url: "https://netbuildos.com",
    description: "BAS retrofit SaaS platform. Agent Casey monitors deploys; Alex tracks BuildOS sales pipeline.",
    status: "ready" as const,
    category: "Product",
    color: "bg-indigo-600",
    initial: "BO",
    details: [
      "Agent: Casey (DevOps), Alex (Sales)",
      "API: BuildOS internal REST API",
      "Data: deploy status, subscriber count, incident alerts",
    ],
  },
  {
    id: "notion",
    name: "Notion",
    url: "",
    description: "Workspace databases — Helpdesk, Tasks, Notes, Renewals, Customers, Partners, Connections.",
    status: "ready" as const,
    category: "Operations",
    color: "bg-slate-800",
    initial: "NT",
    details: [
      "Token: configured ✅",
      "Databases: 7 connected",
      "Agent: Jordan (primary), Riley (helpdesk)",
      "⚠️ Ensure all 7 databases are shared with the Notion integration",
    ],
  },
  {
    id: "zoho-crm",
    name: "Zoho CRM",
    url: "",
    description: "Contact, pipeline, and deal management for AJB & BuildOS sales.",
    status: "roadmap" as const,
    category: "Sales",
    color: "bg-red-500",
    initial: "ZC",
    details: [
      "Agent: Alex",
      "Pending: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN",
      "Use: lead sync, deal stage updates, contact lookup",
    ],
  },
  {
    id: "zoho-books",
    name: "Zoho Books",
    url: "",
    description: "Invoicing, P&L, cashflow, and expense tracking.",
    status: "roadmap" as const,
    category: "Finance",
    color: "bg-orange-500",
    initial: "ZB",
    details: [
      "Agent: Morgan",
      "Pending: ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN",
      "Use: invoice generation, payment tracking, monthly P&L pulls",
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    url: "",
    description: "Executive email sending via andrew@upnx.asia for agent-drafted communications.",
    status: "roadmap" as const,
    category: "Communications",
    color: "bg-red-600",
    initial: "GM",
    details: [
      "Agent: Jary (drafting + sending on approval)",
      "Pending: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER",
      "Use: client emails, proposals, partner comms — human-in-the-loop before send",
    ],
  },
];

const statusStyle = {
  connected: { label: "Connected",  icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ready:     { label: "Ready",      icon: CheckCircle2, cls: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  roadmap:   { label: "Roadmap",    icon: Clock4,       cls: "text-amber-600 bg-amber-50 border-amber-200" },
};

const categoryColors: Record<string, string> = {
  Product:        "bg-indigo-100 text-indigo-700",
  Operations:     "bg-slate-100 text-slate-700",
  Sales:          "bg-blue-100 text-blue-700",
  Finance:        "bg-emerald-100 text-emerald-700",
  Communications: "bg-rose-100 text-rose-700",
};

export default function IntegrationsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(INTEGRATIONS.map(i => i.category)))];
  const filtered = categoryFilter === "All"
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === categoryFilter);

  const toggle = (id: string) => setExpanded(e => e === id ? null : id);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Messaging & Integrations</h1>
        <p className="text-sm text-slate-500 mt-0.5">IM channels and connected services</p>
      </div>

      {/* ── IM Tools ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <MessageSquare size={15} className="text-slate-400" /> IM Tools (SSO)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {IM_TOOLS.map(tool => {
            const { label, icon: StatusIcon, cls } = statusStyle[tool.status];
            return (
              <div key={tool.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${tool.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {tool.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{tool.name}</p>
                      {tool.sso && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">SSO</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">{tool.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cls}`}>
                    <StatusIcon size={12} />
                    {label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-snug">{tool.details}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Integrations ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Integration Readiness</h2>

        {/* Summary bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          {(["ready","roadmap"] as const).map(s => {
            const count = INTEGRATIONS.filter(i => i.status === s).length;
            const { label, cls } = statusStyle[s];
            return (
              <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cls}`}>
                {count} {label}
              </div>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                categoryFilter === c
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >{c}</button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(item => {
            const { label, icon: StatusIcon, cls } = statusStyle[item.status];
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                  onClick={() => toggle(item.id)}
                >
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {item.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${categoryColors[item.category] || "bg-slate-100 text-slate-600"}`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cls}`}>
                      <StatusIcon size={12} />
                      {label}
                    </span>
                    <Info size={15} className={`text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.description}</p>
                    <ul className="space-y-1">
                      {item.details.map((d, i) => (
                        <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <span className="text-slate-300 mt-0.5 shrink-0">·</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:underline"
                      >
                        <ExternalLink size={12} /> {item.url}
                      </a>
                    )}
                    {item.status === "roadmap" && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                        [ACTION REQUIRED] Add missing credentials to <code className="font-mono bg-amber-100 px-1 rounded">openclaw.json</code> env block before enabling.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
