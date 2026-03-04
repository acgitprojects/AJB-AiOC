"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw, Mail, CalendarDays, CheckSquare, Newspaper, TrendingUp, ChevronDown,
} from "lucide-react";
import type { DailyBriefing, BriefingSection } from "@ajb/contract";

// ── constants ─────────────────────────────────────────────────────────────────
const GLASS = "glass glass-hover rounded-xl shadow-card";
const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const SECTION_ICONS: Record<string, React.ElementType> = {
  email:     Mail,
  calendar:  CalendarDays,
  tasks:     CheckSquare,
  news:      Newspaper,
  financial: TrendingUp,
};

// ── BriefingCard ─────────────────────────────────────────────────────────────
function BriefingCard({ section }: { section: BriefingSection }) {
  const [open, setOpen] = useState(true);
  const Icon = SECTION_ICONS[section.id] ?? Newspaper;

  return (
    <div
      className={`${GLASS} overflow-hidden border transition-all`}
      style={{ borderColor: `${section.accent}25` }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 group"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${section.accent}18` }}
          >
            <Icon size={16} style={{ color: section.accent }} />
          </span>
          <span
            className={`${MONO} text-sm font-semibold tracking-wide`}
            style={{ color: section.accent }}
          >
            {section.title}
          </span>
          <span
            className={`${MONO} text-[11px] px-2 py-0.5 rounded-full`}
            style={{ background: `${section.accent}15`, color: section.accent }}
          >
            {section.items.length}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Body */}
      {open && (
        <ul
          className="px-5 pb-4 space-y-2 border-t"
          style={{ borderColor: `${section.accent}15` }}
        >
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 pt-2">
              <span
                className="w-1 h-1 rounded-full mt-[7px] flex-shrink-0"
                style={{ background: section.accent }}
              />
              <span
                className="text-sm text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, `<strong class="text-slate-100">$1</strong>`) }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BriefingPage() {
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
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
            Morning Brief
          </h1>
          {data && !loading && (
            <p className={`${LABEL} mt-1`}>
              {data.date} &nbsp;·&nbsp; generated at {data.generatedAt} by Jary
            </p>
          )}
        </div>

        <button
          onClick={triggerNow}
          disabled={triggering || loading}
          className={`${MONO} flex items-center gap-2 text-xs px-4 py-2 rounded-lg border
            border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)]
            transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <RefreshCw size={13} className={triggering ? "animate-spin" : ""} />
          {triggering ? "Generating…" : "Trigger Now"}
        </button>
      </div>

      {/* Loading skeleton */}
      {(loading || triggering) && (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl h-14 bg-navy-800/50" />
          ))}
        </div>
      )}

      {/* Sections */}
      {!loading && !triggering && data && (
        <div className="space-y-3 animate-fade-in">
          {data.sections.map(section => (
            <BriefingCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
