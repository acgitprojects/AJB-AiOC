"use client";

import { useState, useEffect } from "react";
import { type PipelineItem } from "@/lib/mock-data";
import { Loader2 } from "lucide-react";

const GLASS = "glass glass-hover rounded-xl p-5 shadow-card";
const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const pipelineStages: PipelineItem["stage"][] = ["idea", "drafting", "review", "scheduled", "published"];

const stageAccent: Record<string, string> = {
  idea:      "#475569",
  drafting:  "#00d4ff",
  review:    "#f59e0b",
  scheduled: "#8b5cf6",
  published: "#10d6a0",
};

export default function PipelinePage() {
  const [items,   setItems]   = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pipeline")
      .then(r => r.json())
      .then((d: PipelineItem[]) => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
          Content Pipeline
        </h1>
        <p className={`${LABEL} mt-1`}>Track content from idea to publication</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin text-[#00d4ff]" />
          <span className="text-sm">Loading pipeline from OpenClaw…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in">
          {pipelineStages.map(stage => {
            const stageItems = items.filter(p => p.stage === stage);
            const accent     = stageAccent[stage];
            return (
              <div
                key={stage}
                className="rounded-xl border"
                style={{ borderColor: `${accent}25`, background: `${accent}06` }}
              >
                <div
                  className="px-3 py-2 flex items-center justify-between border-b"
                  style={{ borderColor: `${accent}20` }}
                >
                  <span
                    className={`${MONO} text-xs font-semibold uppercase tracking-widest`}
                    style={{ color: accent }}
                  >
                    {stage}
                  </span>
                  <span
                    className={`${MONO} text-xs px-1.5 py-0.5 rounded-full`}
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    {stageItems.length}
                  </span>
                </div>

                <div className="p-2 space-y-2">
                  {stageItems.length === 0 && <p className="text-slate-700 text-xs p-1">—</p>}
                  {stageItems.map(p => (
                    <div
                      key={p.id}
                      className="glass rounded-lg p-2.5 hover:border-[rgba(0,212,255,0.2)] transition-all"
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-full h-20 object-cover rounded-md mb-2 opacity-70"
                        />
                      )}
                      <p className="text-slate-200 text-xs font-medium leading-snug">{p.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`${MONO} text-[10px] text-slate-500`}>{p.agent}</span>
                        <span
                          className={`${MONO} text-[10px] px-1.5 py-0.5 rounded`}
                          style={{ background: `${accent}18`, color: accent }}
                        >
                          {p.product}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
