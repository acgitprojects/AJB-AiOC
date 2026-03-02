"use client";

import { useState, useCallback } from "react";
import { KANBAN_TASKS, type KanbanTask } from "@/lib/mock-data";

const GLASS = "glass glass-hover rounded-xl p-5 shadow-card";
const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const kanbanCols: { key: KanbanTask["status"]; label: string; accent: string }[] = [
  { key: "backlog",     label: "Backlog",     accent: "#475569" },
  { key: "in-progress", label: "In Progress", accent: "#00d4ff" },
  { key: "review",      label: "Review",      accent: "#f59e0b" },
  { key: "done",        label: "Done",        accent: "#10d6a0" },
];

export default function BoardPage() {
  const [tasks, setTasks] = useState(KANBAN_TASKS);

  const move = useCallback((id: string, status: KanbanTask["status"]) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
          Task Board
        </h1>
        <p className={`${LABEL} mt-1`}>Kanban — drag tasks across columns</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {kanbanCols.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div
              key={col.key}
              className="rounded-xl border"
              style={{ borderColor: `${col.accent}25`, background: `${col.accent}06` }}
            >
              <div
                className="px-3 py-2.5 flex items-center justify-between border-b"
                style={{ borderColor: `${col.accent}20` }}
              >
                <span
                  className={`${MONO} text-xs font-semibold uppercase tracking-widest`}
                  style={{ color: col.accent }}
                >
                  {col.label}
                </span>
                <span
                  className={`${MONO} text-xs px-1.5 py-0.5 rounded-full`}
                  style={{ background: `${col.accent}18`, color: col.accent }}
                >
                  {colTasks.length}
                </span>
              </div>

              <div className="p-2 space-y-2 min-h-[120px]">
                {colTasks.map(t => (
                  <div
                    key={t.id}
                    className="glass rounded-lg p-2.5 hover:border-[rgba(0,212,255,0.25)] transition-all group/card cursor-default"
                  >
                    <p className="text-slate-200 text-xs font-medium leading-snug">{t.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`${MONO} text-[11px] text-slate-500`}>{t.agent}</span>
                      <span
                        className={`${MONO} text-[11px] px-1.5 py-0.5 rounded`}
                        style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}
                      >
                        {t.tag}
                      </span>
                    </div>
                    {/* Move buttons */}
                    <div className="flex gap-1 mt-2 flex-wrap opacity-0 group-hover/card:opacity-100 transition-opacity">
                      {kanbanCols
                        .filter(c => c.key !== col.key)
                        .map(c => (
                          <button
                            key={c.key}
                            onClick={() => move(t.id, c.key)}
                            className={`${MONO} text-[10px] px-1.5 py-0.5 rounded transition-colors`}
                            style={{ background: `${c.accent}18`, color: c.accent }}
                          >
                            → {c.label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
