/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AGENTS, PERF_WEEKLY, PERF_MONTHLY } from "@/lib/mock-data";
import {
  TrendingUp, Users, Zap, RefreshCw, Mail, CalendarDays, CheckSquare, Newspaper,
  CheckCheck, Activity, ArrowUpRight, ArrowDownRight, ChevronDown,
} from "lucide-react";
import type { DailyBriefing, BriefingSection } from "@/lib/mock-briefing";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GLASS  = "glass glass-hover rounded-xl p-5 shadow-card";
const LABEL  = "text-xs text-slate-500 font-medium uppercase tracking-widest";
const MONO   = "font-mono-jet";

// ─── Custom dark tooltip ──────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-2.5 text-xs shadow-glow-sm border border-[rgba(0,212,255,0.15)]">
      <p className={`${MONO} text-[#00d4ff] mb-1`}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.stroke }} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.stroke }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, trend, icon: Icon, accent }: {
  label: string; value: string; sub: string; trend?: "up"|"down"|"neutral";
  icon: React.ElementType; accent: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Activity;
  const trendColor = trend === "up" ? "text-[#10d6a0]" : trend === "down" ? "text-red-400" : "text-slate-500";
  return (
    <div className={`${GLASS} flex items-start gap-4 group`}>
      <div className="rounded-lg p-2.5 shrink-0" style={{ background: `${accent}18` }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${MONO} text-2xl font-semibold text-slate-100 tracking-tight`}>{value}</p>
        <p className={`${LABEL} mt-0.5`}>{label}</p>
        <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={11} />{sub}
        </p>
      </div>
      <div className="w-1 self-stretch rounded-full opacity-60 shrink-0" style={{ background: accent }} />
    </div>
  );
}

// ─── Hex agent avatar ─────────────────────────────────────────────────────────
const ringColor: Record<string, string> = {
  online:  "#10d6a0",
  idle:    "#f59e0b",
  offline: "#475569",
};

function AgentHex({ agent }: { agent: typeof AGENTS[0] }) {
  const color = ringColor[agent.status];
  return (
    <div className={`${GLASS} flex flex-col items-center gap-3 p-4 text-center group cursor-default`}>
      {/* hex */}
      <div className="relative mt-1">
        <div
          className="w-14 h-14 hex-clip flex items-center justify-center text-[#040d18] font-bold text-sm font-mono-jet"
          style={{ background: `linear-gradient(135deg, ${color}90, ${color}40)` }}
        >
          {agent.name.slice(0, 2).toUpperCase()}
        </div>
        {/* status ring blur */}
        <div className="absolute -inset-1.5 hex-clip opacity-30 blur-sm -z-10"
          style={{ background: color }} />
        {/* status dot */}
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#040d18]"
          style={{ background: color }}>
          {agent.status === "online" && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: color }} />
          )}
        </span>
      </div>
      <div>
        <p className="text-slate-100 text-xs font-semibold">{agent.name}</p>
        <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{agent.role}</p>
        <p className={`${MONO} text-[10px] mt-1`} style={{ color }}>{agent.tasksCompleted} tasks</p>
      </div>
    </div>
  );
}

// ─── Section icons ────────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  email:     Mail,
  calendar:  CalendarDays,
  tasks:     CheckSquare,
  news:      Newspaper,
  financial: TrendingUp,
};

// ─── Briefing card ────────────────────────────────────────────────────────────
function BriefingCard({ section }: { section: BriefingSection }) {
  const [open, setOpen] = useState(true);
  const Icon = SECTION_ICONS[section.id] ?? Newspaper;

  return (
    <div
      className="rounded-xl overflow-hidden border transition-all glass shadow-card"
      style={{ borderColor: `${section.accent}25` }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${section.accent}18` }}
          >
            <Icon size={14} style={{ color: section.accent }} />
          </span>
          <span
            className={`${MONO} text-xs font-semibold tracking-wide`}
            style={{ color: section.accent }}
          >
            {section.title}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          className="px-4 pb-3 space-y-1.5 border-t"
          style={{ borderColor: `${section.accent}15` }}
        >
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 pt-2">
              <span
                className="w-1 h-1 rounded-full mt-[6px] flex-shrink-0"
                style={{ background: section.accent }}
              />
              <span
                className="text-xs text-slate-400 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: item.replace(/\*\*(.+?)\*\*/g, `<strong class="text-slate-200">$1</strong>`),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Morning brief panel ──────────────────────────────────────────────────────
function BriefingPanel() {
  const [data,       setData]       = useState<DailyBriefing | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing");
      setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const triggerNow = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      setData(await res.json());
    } catch { /* ignore */ }
    setTriggering(false);
  };

  useEffect(() => { fetchBriefing(); }, []);

  return (
    <div className={`${GLASS}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Morning Brief</h3>
          {data && !loading && (
            <p className={`${LABEL} mt-0.5`}>Generated at {data.generatedAt} · by Jary</p>
          )}
        </div>
        <button
          onClick={triggerNow}
          disabled={triggering || loading}
          className={`${MONO} flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border
            border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.07)]
            transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <RefreshCw size={11} className={triggering ? "animate-spin" : ""} />
          {triggering ? "Generating…" : "Trigger Now"}
        </button>
      </div>

      {(loading || triggering) && (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg h-10 bg-navy-800/50" />
          ))}
        </div>
      )}

      {!loading && !triggering && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 animate-fade-in">
          {data.sections.map(section => (
            <BriefingCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview() {
  const [range, setRange] = useState<"weekly"|"monthly">("weekly");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const data = range === "weekly" ? PERF_WEEKLY : PERF_MONTHLY;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
            Operations Centre
          </h1>
          <p className={`${MONO} text-xs text-[#00d4ff] mt-1`}>
            AiOC·{" "}
            <span className="text-slate-500">
              {new Date().toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"short", year:"numeric" })}
            </span>
          </p>
        </div>
        <p className={`${MONO} text-2xl font-bold text-slate-100 tracking-widest tabular-nums`}>{clock}</p>
      </div>

      {/* Morning brief */}
      <BriefingPanel />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tasks today"       value="23"    sub="+12% vs yesterday"              trend="up"      icon={CheckCheck}    accent="#10d6a0" />
        <StatCard label="Active agents"     value="8/10"  sub="2 idle"                         trend="neutral" icon={Users}         accent="#00d4ff" />
        <StatCard label="Avg response"      value="1.9s"  sub="-0.3s vs last week"             trend="up"      icon={Zap}           accent="#f59e0b" />
        <StatCard label="AJC subscribers"  value="34"    sub="Target: 100 by end Mar"          trend="down"    icon={TrendingUp}    accent="#8b5cf6" />
      </div>

      {/* Chart */}
      <div className={`${GLASS}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Task Performance</h3>
            <p className={`${LABEL} mt-0.5`}>Resolved vs total</p>
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
            {(["weekly","monthly"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  range === r
                    ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]"
                    : "text-slate-500 hover:text-slate-300"
                }`}>{r === "weekly" ? "7 days" : "4 weeks"}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cyan-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="violet-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="rgba(0,212,255,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<DarkTooltip />} />
            <Area type="monotone" dataKey="tasks"    name="Total"    stroke="#8b5cf6" strokeWidth={1.5} fill="url(#violet-fill)" dot={false} />
            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#00d4ff" strokeWidth={1.5} fill="url(#cyan-fill)"   dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Agent hex grid */}
      <div className={`${GLASS}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Agent Network</h3>
          <p className={`${LABEL}`}>10 agents · 8 online</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {AGENTS.map(a => <AgentHex key={a.id} agent={a} />)}
        </div>
      </div>

      {/* Agent perf table */}
      <div className={`${GLASS}`}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Performance Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                {["Agent","Role","Tasks","Response%","Avg Resp","Status"].map(h => (
                  <th key={h} className={`pb-2.5 text-left ${LABEL} ${h !== "Agent" && h !== "Role" ? "text-right" : ""} ${h === "Status" ? "!text-left pl-3" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map(a => (
                <tr key={a.id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,212,255,0.03)] transition-colors">
                  <td className={`py-2.5 ${MONO} text-slate-100 text-xs font-semibold`}>{a.name}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{a.role}</td>
                  <td className={`py-2.5 text-right ${MONO} text-xs text-slate-300`}>{a.tasksCompleted}</td>
                  <td className="py-2.5 text-right">
                    <span className={`${MONO} text-xs font-semibold ${
                      a.responseRate >= 95 ? "text-[#10d6a0]" : a.responseRate >= 90 ? "text-[#f59e0b]" : "text-red-400"
                    }`}>{a.responseRate}%</span>
                  </td>
                  <td className={`py-2.5 text-right ${MONO} text-xs text-slate-500`}>{(a.avgResponseMs/1000).toFixed(1)}s</td>
                  <td className="py-2.5 pl-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ a.status === "online" ? "dot-online" : a.status === "idle" ? "dot-idle" : "dot-offline" }`} />
                      <span className="text-xs text-slate-500 capitalize">{a.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <Overview />
    </div>
  );
}

