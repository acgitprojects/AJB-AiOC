"use client";

import { AGENTS } from "@/lib/mock-data";

const GLASS = "glass glass-hover rounded-xl p-5 shadow-card";
const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const ringColor: Record<string, string> = {
  online:  "#10d6a0",
  idle:    "#f59e0b",
  offline: "#475569",
};

export default function OrgPage() {
  const jary    = AGENTS.find(a => a.id === "jary")!;
  const reports = AGENTS.filter(a => a.reportsTo === "jary");

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
          Org Chart
        </h1>
        <p className={`${LABEL} mt-1`}>Agent hierarchy &amp; reporting structure</p>
      </div>

      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Root */}
        <div className={`${GLASS} px-6 py-4 text-center w-60`}>
          <div
            className="w-14 h-14 hex-clip flex items-center justify-center mx-auto mb-3
              text-[#040d18] font-bold text-sm font-mono-jet"
            style={{
              background: "linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)",
            }}
          >
            JY
          </div>
          <p className={`${MONO} text-sm font-semibold text-slate-100`}>{jary.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{jary.role}</p>
          <p className={`${MONO} text-[11px] text-[#00d4ff] mt-1`}>{jary.model}</p>
        </div>

        {/* Connector */}
        <div className="w-px h-8 bg-gradient-to-b from-[#00d4ff] to-transparent" />

        {/* Reports */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
          {reports.map(a => {
            const color = ringColor[a.status];
            return (
              <div key={a.id} className={`${GLASS} p-4 text-center`}>
                <div
                  className="w-10 h-10 hex-clip flex items-center justify-center mx-auto mb-2.5
                    font-bold text-[11px] font-mono-jet text-[#040d18]"
                  style={{ background: `linear-gradient(135deg, ${color}90, ${color}40)` }}
                >
                  {a.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-slate-200 text-xs font-semibold">{a.name}</p>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-tight">{a.role}</p>
                <p
                  className={`${MONO} text-[11px] mt-1.5 flex items-center justify-center gap-1`}
                  style={{ color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  {a.status}
                </p>
                <p className={`${MONO} text-[10px] text-slate-600 mt-0.5`}>{a.model}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
