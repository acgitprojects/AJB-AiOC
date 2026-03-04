"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock4, MessageSquare, ExternalLink, Info, Radio, Loader2, AlertTriangle } from "lucide-react";
import type { GatewayStatusAPIResponse } from "@/app/api/openclaw/status/route";

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
  connected: { label: "Connected",  icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  ready:     { label: "Ready",      icon: CheckCircle2, cls: "text-arc-cyan bg-arc-cyan/10 border-arc-cyan/30" },
  roadmap:   { label: "Roadmap",    icon: Clock4,       cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
};

const categoryColors: Record<string, string> = {
  Product:        "bg-arc-cyan/10 text-arc-cyan",
  Operations:     "bg-slate-700/50 text-slate-300",
  Sales:          "bg-blue-500/15 text-blue-300",
  Finance:        "bg-emerald-500/15 text-emerald-300",
  Communications: "bg-rose-500/15 text-rose-300",
};

export default function IntegrationsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [gwStatus, setGwStatus] = useState<GatewayStatusAPIResponse | null>(null);
  const [gwLoading, setGwLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setGwLoading(true);
      try {
        const res = await fetch("/api/openclaw/status", { cache: "no-store" });
        const data: GatewayStatusAPIResponse = await res.json();
        if (!cancelled) setGwStatus(data);
      } catch {
        if (!cancelled) setGwStatus({ connected: false, gatewayUrl: "", viaApiServer: false, checkedAt: new Date().toISOString(), error: "Fetch failed" });
      } finally {
        if (!cancelled) setGwLoading(false);
      }
    };
    check();
    // Refresh every 30 s
    const interval = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const categories = ["All", ...Array.from(new Set(INTEGRATIONS.map(i => i.category)))];
  const filtered = categoryFilter === "All"
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === categoryFilter);

  const toggle = (id: string) => setExpanded(e => e === id ? null : id);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Messaging &amp; <span className="text-arc-cyan">Integrations</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">IM channels and connected services</p>
      </div>

      {/* ── OpenClaw Gateway Status Banner ── */}
      <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        gwLoading
          ? "border-navy-700 bg-navy-900/50 text-slate-400"
          : gwStatus?.connected
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      }`}>
        <span className="mt-0.5 shrink-0">
          {gwLoading
            ? <Loader2 size={16} className="animate-spin" />
            : gwStatus?.connected
              ? <Radio size={16} className="text-emerald-400" />
              : <AlertTriangle size={16} className="text-amber-400" />
          }
        </span>
        <div className="flex-1 min-w-0">
          {gwLoading && <span>Checking OpenClaw gateway…</span>}
          {!gwLoading && gwStatus?.connected && (
            <>
              <span className="font-semibold">OpenClaw gateway is running</span>
              <span className="ml-2 text-xs font-mono-jet text-emerald-400">{gwStatus.gatewayUrl}</span>
              {gwStatus.version && <span className="ml-2 text-xs text-emerald-500">v{gwStatus.version}</span>}
              {gwStatus.channels && gwStatus.channels.length > 0 && (
                <span className="ml-2 text-xs text-emerald-500">· Channels: {gwStatus.channels.join(", ")}</span>
              )}
            </>
          )}
          {!gwLoading && !gwStatus?.connected && (
            <>
              <span className="font-semibold">OpenClaw gateway not reachable</span>
              <span className="ml-2 text-xs">{gwStatus?.error}</span>
              <p className="text-xs mt-1 text-amber-400/80">
                Start it with <code className="font-mono-jet bg-navy-800 rounded px-1 text-arc-cyan">npx openclaw --config openclaw.json</code> then refresh.
              </p>
            </>
          )}
        </div>
        <span className="text-xs text-slate-600 shrink-0 mt-0.5">
          {gwStatus?.checkedAt ? new Date(gwStatus.checkedAt).toLocaleTimeString() : ""}
        </span>
      </div>

      {/* ── IM Tools ── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <MessageSquare size={13} /> IM Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {IM_TOOLS.map(tool => {
            const { label, icon: StatusIcon, cls } = statusStyle[tool.status];
            return (
              <div key={tool.id} className="glass glass-hover rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${tool.color} flex items-center justify-center text-white text-sm font-bold font-mono-jet shrink-0 shadow-[0_0_12px_rgba(0,0,0,0.4)]`}>
                    {tool.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{tool.name}</p>
                      {tool.sso && (
                        <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded font-medium">SSO</span>
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
                <p className="text-xs text-slate-600 mt-2 leading-snug font-mono-jet">{tool.details}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Integrations ── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Integration Readiness</h2>

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
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 text-xs rounded-full border font-medium transition-all duration-200 ${
                categoryFilter === c
                  ? "bg-arc-cyan/20 text-arc-cyan border-arc-cyan/60 shadow-[0_0_8px_rgba(0,212,255,0.3)]"
                  : "border-navy-700 text-slate-400 hover:border-arc-cyan/40 hover:text-arc-cyan/70"
              }`}
            >{c}</button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(item => {
            const { label, icon: StatusIcon, cls } = statusStyle[item.status];
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} className="glass rounded-xl overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
                  onClick={() => toggle(item.id)}
                >
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-white text-sm font-bold font-mono-jet shrink-0 shadow-[0_0_12px_rgba(0,0,0,0.4)]`}>
                    {item.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${categoryColors[item.category] || "bg-navy-800 text-slate-400"}`}>
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
                    <Info size={15} className={`text-slate-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-navy-700/50 px-4 py-3 bg-navy-950/40 animate-fade-in">
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{item.description}</p>
                    <ul className="space-y-1">
                      {item.details.map((d, i) => (
                        <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <span className="text-arc-cyan/40 mt-0.5 shrink-0">·</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs text-arc-cyan hover:underline"
                      >
                        <ExternalLink size={12} /> {item.url}
                      </a>
                    )}
                    {item.status === "roadmap" && (
                      <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-400">
                        [ACTION REQUIRED] Add missing credentials to <code className="font-mono-jet bg-navy-800 rounded px-1 text-arc-cyan">openclaw.json</code> env block before enabling.
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
