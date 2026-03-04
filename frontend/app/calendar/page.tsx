"use client";

import { useState, useEffect } from "react";
import { type CalTask } from "@ajb/contract";
import { ChevronLeft, ChevronRight } from "lucide-react";

const GLASS = "glass glass-hover rounded-xl p-5 shadow-card";
const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const priorityColor: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#475569",
};

export default function CalendarPage() {
  const [current,  setCurrent]  = useState(new Date(2026, 2, 1));
  const [selected, setSelected] = useState("2026-03-03");
  const [calData,  setCalData]  = useState<Record<string, CalTask[]>>({});

  useEffect(() => {
    fetch("/api/calendar")
      .then(r => r.json())
      .then((d: Record<string, CalTask[]>) => setCalData(d))
      .catch(() => {});
  }, []);

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName   = current.toLocaleString("default", { month: "long", year: "numeric" });
  const pad = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const tasks = calData[selected] ?? [];

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
          Calendar
        </h1>
        <p className={`${LABEL} mt-1`}>Scheduled tasks &amp; agent assignments</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 animate-fade-in">
        {/* Grid */}
        <div className={`${GLASS} lg:w-80 shrink-0`}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrent(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-slate-400 hover:text-[#00d4ff] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className={`${MONO} text-xs font-semibold text-slate-200 uppercase tracking-widest`}>
              {monthName}
            </span>
            <button
              onClick={() => setCurrent(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] text-slate-400 hover:text-[#00d4ff] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className={`${MONO} text-[11px] text-slate-600 pb-1`}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const key     = pad(d);
              const hasTasks = !!calData[key];
              const isToday = d === 3 && month === 2 && year === 2026;
              const isSel   = key === selected;
              return (
                <button
                  key={d}
                  onClick={() => setSelected(key)}
                  className={`relative ${MONO} text-xs py-1.5 rounded-md transition-all font-medium
                    ${isSel
                      ? "bg-[#00d4ff] text-[#040d18] shadow-glow-sm"
                      : isToday
                        ? "border border-[#00d4ff]/40 text-[#00d4ff]"
                        : "text-slate-500 hover:text-slate-200 hover:bg-[rgba(255,255,255,0.05)]"
                    }`}
                >
                  {d}
                  {hasTasks && !isSel && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8b5cf6]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks */}
        <div className={`flex-1 ${GLASS}`}>
          <h3 className={`${MONO} text-xs font-semibold text-[#00d4ff] uppercase tracking-widest mb-4`}>
            {selected} — {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </h3>
          {tasks.length === 0 ? (
            <p className="text-slate-600 text-sm">No tasks scheduled.</p>
          ) : (
            <div className="space-y-2.5">
              {tasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg
                    bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]
                    hover:border-[rgba(0,212,255,0.15)] transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{
                      background:  priorityColor[t.priority],
                      boxShadow:  `0 0 6px ${priorityColor[t.priority]}80`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium leading-tight">{t.title}</p>
                    <p className="text-slate-500 text-xs mt-1">{t.agent}</p>
                  </div>
                  <span
                    className={`${MONO} text-[11px] px-2 py-0.5 rounded-full border ${
                      t.status === "done"
                        ? "border-[#10d6a0]/30 text-[#10d6a0]"
                        : t.status === "in-progress"
                          ? "border-[#00d4ff]/30 text-[#00d4ff]"
                          : "border-slate-700 text-slate-600"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
