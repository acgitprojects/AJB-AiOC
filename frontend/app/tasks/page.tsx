"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CheckSquare, List, Columns2, CalendarDays, Bot, User,
  CheckCircle2, Circle, Clock, ChevronDown, ChevronRight,
  AlertCircle, ChevronLeft, Tag, Loader2,
} from "lucide-react";
import type { MyTask, TaskAssignee } from "@/lib/mock-data";
import { AGENTS } from "@/lib/mock-data";

// ─── Constants ───────────────────────────────────────────────────────────────

const GLASS  = "glass glass-hover rounded-xl shadow-card";
const LABEL  = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const PRIORITY_CFG = {
  high:   { label: "High",   colour: "#ef4444", bg: "bg-red-500/10    text-red-400    border-red-500/20"    },
  medium: { label: "Medium", colour: "#f59e0b", bg: "bg-amber-500/10  text-amber-400  border-amber-500/20"  },
  low:    { label: "Low",    colour: "#475569", bg: "bg-slate-700/40  text-slate-400  border-slate-600/30"  },
} as const;

const STATUS_CFG = {
  pending:     { label: "Pending",     icon: Circle,       colour: "text-slate-400",  badge: "bg-slate-700/40  text-slate-400  border-slate-600/30"  },
  "in-progress": { label: "In Progress", icon: Clock,        colour: "text-[#00d4ff]",  badge: "bg-cyan-500/10   text-cyan-400   border-cyan-500/20"   },
  done:        { label: "Done",        icon: CheckCircle2, colour: "text-[#10d6a0]",  badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  delegated:   { label: "Delegated",   icon: Clock,        colour: "text-yellow-400", badge: "bg-yellow-500/10  text-yellow-400  border-yellow-500/20"   },
} as const;

const KANBAN_COLS: { key: MyTask["status"]; label: string; accent: string }[] = [
  { key: "pending",     label: "Pending",     accent: "#475569" },
  { key: "in-progress", label: "In Progress", accent: "#00d4ff" },
  { key: "delegated",   label: "Delegated",   accent: "#facc15" },
  { key: "done",        label: "Done",        accent: "#10d6a0" },
];

type View = "list" | "kanban" | "calendar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function agentName(id: string) {
  return AGENTS.find(a => a.id === id)?.name ?? id;
}

function agentInitials(id: string) {
  const n = agentName(id);
  return n.length >= 2 ? n.slice(0, 2).toUpperCase() : n.toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(task: MyTask) {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate) < new Date();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PriorityDot({ p }: { p: MyTask["priority"] }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
      style={{ background: PRIORITY_CFG[p].colour }}
      title={PRIORITY_CFG[p].label}
    />
  );
}

function PriorityBadge({ p }: { p: MyTask["priority"] }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${PRIORITY_CFG[p].bg}`}>
      <PriorityDot p={p} />
      {PRIORITY_CFG[p].label}
    </span>
  );
}

function StatusBadge({ s }: { s: MyTask["status"] }) {
  const cfg = STATUS_CFG[s];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.badge}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function AssigneeBadge({ a }: { a: TaskAssignee }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-700/40 bg-slate-800/40 text-xs text-slate-400">
      {a.type === "agent" ? <Bot size={10} className="text-violet-400" /> : <User size={10} className="text-cyan-400" />}
      {a.name}
    </span>
  );
}

function AssignDropdown({
  task,
  onAssign,
}: {
  task: MyTask;
  onAssign: (assignee: TaskAssignee) => void;
}) {
  const [open, setOpen] = useState(false);

  const humans: TaskAssignee[] = [
    { type: "human", id: "andrew", name: "Andrew (Me)" },
    { type: "human", id: "team",   name: "Team" },
  ];
  const agentAssignees: TaskAssignee[] = AGENTS.map(a => ({
    type: "agent" as const,
    id: a.id,
    name: a.name,
  }));

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-xs text-slate-500 hover:text-[#00d4ff] transition-colors px-2 py-0.5 rounded border border-slate-700/30 hover:border-cyan-500/30 whitespace-nowrap"
      >
        Assign to…
      </button>
      {open && (
        <div
          className="absolute right-0 bottom-7 z-50 w-48 rounded-xl border border-[rgba(0,212,255,0.12)] bg-[#0a1628] shadow-xl p-1 animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          <p className={`${LABEL} px-2 pt-1 pb-0.5`}>Humans</p>
          {humans.map(h => (
            <button
              key={h.id}
              onClick={() => { onAssign(h); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[rgba(0,212,255,0.06)] hover:text-[#00d4ff] transition-colors"
            >
              <User size={12} className="text-cyan-400" /> {h.name}
              {task.assignee.id === h.id && <CheckCircle2 size={10} className="ml-auto text-emerald-400" />}
            </button>
          ))}
          <div className="my-1 mx-1 h-px bg-slate-800" />
          <p className={`${LABEL} px-2 pt-1 pb-0.5`}>AI Agents</p>
          {agentAssignees.map(ag => (
            <button
              key={ag.id}
              onClick={() => { onAssign(ag); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-[rgba(139,92,246,0.08)] hover:text-violet-300 transition-colors"
            >
              <Bot size={12} className="text-violet-400" /> {ag.name}
              {task.assignee.id === ag.id && <CheckCircle2 size={10} className="ml-auto text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task row (list view) ─────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onAssign,
}: {
  task: MyTask;
  onToggle: (id: string, current: MyTask["status"]) => void;
  onAssign: (id: string, assignee: TaskAssignee) => void;
}) {
  const overdue = isOverdue(task);
  return (
    <div className="group/row flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
      {/* Completion toggle */}
      <button
        onClick={() => onToggle(task.id, task.status)}
        className="mt-0.5 shrink-0"
        title={task.status === "done" ? "Mark as pending" : "Mark as done"}
      >
        {task.status === "done"
          ? <CheckCircle2 size={18} className="text-[#10d6a0]" />
          : <Circle size={18} className="text-slate-600 hover:text-[#00d4ff] transition-colors" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <PriorityDot p={task.priority} />
          <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}>
            {task.title}
          </span>
          {overdue && task.status !== "done" && (
            <span className="flex items-center gap-0.5 text-xs text-red-400">
              <AlertCircle size={11} /> Overdue
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge s={task.status} />
          <AssigneeBadge a={task.assignee} />
          {task.dueDate && (
            <span className={`text-xs ${overdue && task.status !== "done" ? "text-red-400" : "text-slate-500"}`}>
              Due {fmtDate(task.dueDate)}
            </span>
          )}
          {task.tags.map(t => (
            <span key={t} className="flex items-center gap-0.5 text-xs text-slate-600">
              <Tag size={9} />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Assign control — visible on row hover */}
      <div className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 self-center">
        <AssignDropdown task={task} onAssign={(a) => onAssign(task.id, a)} />
      </div>
    </div>
  );
}

// ─── Kanban card ─────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  onMove,
  onAssign,
}: {
  task: MyTask;
  onMove: (id: string, status: MyTask["status"]) => void;
  onAssign: (id: string, assignee: TaskAssignee) => void;
}) {
  const overdue = isOverdue(task);
  const others = KANBAN_COLS.filter(c => c.key !== task.status);

  return (
    <div className="group/card glass rounded-xl p-4 shadow-card space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PriorityDot p={task.priority} />
          <span className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}>
            {task.title}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <AssigneeBadge a={task.assignee} />
        {task.dueDate && (
          <span className={`text-xs ${overdue && task.status !== "done" ? "text-red-400" : "text-slate-500"}`}>
            Due {fmtDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {task.tags.map(t => (
          <span key={t} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-slate-800/60 text-slate-500 border border-slate-700/30">
            <Tag size={9} />{t}
          </span>
        ))}
      </div>

      {/* Agent creator line */}
      <div className="flex items-center justify-between pt-1 border-t border-[rgba(255,255,255,0.05)]">
        <span className="text-xs text-slate-500 font-mono-jet">via {agentName(task.createdByAgent)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <AssignDropdown task={task} onAssign={(a) => onAssign(task.id, a)} />
          {others.map(col => (
            <button
              key={col.key}
              onClick={() => onMove(task.id, col.key)}
              className="text-xs px-1.5 py-0.5 rounded border border-slate-700/40 text-slate-500 hover:text-slate-200 hover:border-slate-500/50 transition-colors whitespace-nowrap"
              style={{ color: col.accent, borderColor: `${col.accent}30` }}
              title={`Move to ${col.label}`}
            >
              → {col.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function ListView({
  tasks,
  onToggle,
  onAssign,
}: {
  tasks: MyTask[];
  onToggle: (id: string, s: MyTask["status"]) => void;
  onAssign: (id: string, a: TaskAssignee) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, MyTask[]> = {};
    tasks.forEach(t => {
      const key = t.createdByAgent;
      (map[key] ??= []).push(t);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  if (tasks.length === 0) {
    return (
      <div className={`${GLASS} p-8 flex flex-col items-center gap-3 text-slate-500`}>
        <CheckSquare size={32} className="opacity-30" />
        <span className="text-sm">No tasks match your filters.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(([agentId, agentTasks]) => {
        const isOpen = !collapsed[agentId];
        const done = agentTasks.filter(t => t.status === "done").length;
        return (
          <div key={agentId} className={`${GLASS} overflow-hidden`}>
            {/* Group header */}
            <button
              onClick={() => toggle(agentId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d4ff]/20 to-[#8b5cf6]/20 border border-[rgba(139,92,246,0.3)] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-violet-300 font-mono-jet">{agentInitials(agentId)}</span>
              </div>
              <span className="text-sm font-semibold text-slate-200">{agentName(agentId)}</span>
              <span className="text-xs text-slate-600 font-mono-jet">{done}/{agentTasks.length} done</span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" />
              {isOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </button>

            {/* Task rows */}
            {isOpen && (
              <div className="border-t border-[rgba(255,255,255,0.04)] divide-y divide-[rgba(255,255,255,0.03)]">
                {agentTasks.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={onToggle} onAssign={onAssign} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KanbanView({
  tasks,
  onMove,
  onAssign,
}: {
  tasks: MyTask[];
  onMove: (id: string, s: MyTask["status"]) => void;
  onAssign: (id: string, a: TaskAssignee) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {KANBAN_COLS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">{col.label}</span>
              <span className="ml-auto text-xs font-mono-jet text-slate-500">{colTasks.length}</span>
            </div>
            {/* Cards */}
            <div className="space-y-2.5">
              {colTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">
                  No tasks
                </div>
              ) : (
                colTasks.map(t => (
                  <KanbanCard key={t.id} task={t} onMove={onMove} onAssign={onAssign} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ tasks }: { tasks: MyTask[] }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // Build a map: "YYYY-MM-DD" → tasks with dueDate on that day
  const tasksByDay = useMemo(() => {
    const m: Record<string, MyTask[]> = {};
    tasks.forEach(t => {
      if (!t.dueDate) return;
      const key = t.dueDate.slice(0, 10);
      (m[key] ??= []).push(t);
    });
    return m;
  }, [tasks]);

  const selectedKey = selected;
  const selectedTasks = selectedKey ? (tasksByDay[selectedKey] ?? []) : [];

  const dayKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar grid */}
      <div className={`lg:col-span-2 ${GLASS} p-5`}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-200">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-xs text-slate-600 pb-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dayKey(day);
            const dayTasks = tasksByDay[key] ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selected;

            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`relative rounded-lg p-1.5 transition-all text-sm min-h-[44px] flex flex-col items-center gap-0.5
                  ${isToday ? "ring-1 ring-[#00d4ff]/60" : ""}
                  ${isSelected ? "bg-[rgba(0,212,255,0.10)]" : "hover:bg-[rgba(255,255,255,0.04)]"}
                `}
              >
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                  ${isToday ? "bg-[#00d4ff] text-[#040d18] font-bold" : "text-slate-400"}`}>
                  {day}
                </span>
                {/* Priority dots for tasks on this day */}
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dayTasks.slice(0, 3).map(t => (
                    <span
                      key={t.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: PRIORITY_CFG[t.priority].colour }}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{dayTasks.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div className={`${GLASS} p-5 space-y-3`}>
        <div className={LABEL}>
          {selectedKey
            ? fmtDate(selectedKey + "T00:00:00Z")
            : "Select a day"}
        </div>
        {!selectedKey ? (
          <p className="text-sm text-slate-600">Click a day to see tasks due on that date.</p>
        ) : selectedTasks.length === 0 ? (
          <p className="text-sm text-slate-600">No tasks due on this day.</p>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map(t => (
              <div key={t.id} className="rounded-lg border border-[rgba(255,255,255,0.06)] p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <PriorityDot p={t.priority} />
                  <span className={`text-sm font-medium ${t.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}>
                    {t.title}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge s={t.status} />
                  <AssigneeBadge a={t.assignee} />
                </div>
                <span className="text-xs text-slate-600 font-mono-jet">via {agentName(t.createdByAgent)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const [tasks,   setTasks]   = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<View>("list");

  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAgent,    setFilterAgent]    = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then((d: MyTask[]) => { setTasks(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────
  const patchTask = useCallback(async (id: string, patch: Partial<MyTask>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      // Silent — optimistic state already applied
    }
  }, []);

  const handleToggle = useCallback((id: string, current: MyTask["status"]) => {
    const next: MyTask["status"] = current === "done" ? "pending" : "done";
    patchTask(id, { status: next });
  }, [patchTask]);

  const handleMove = useCallback((id: string, status: MyTask["status"]) => {
    patchTask(id, { status });
  }, [patchTask]);

  const handleAssign = useCallback((id: string, assignee: TaskAssignee) => {
    patchTask(id, { assignee });
  }, [patchTask]);

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus   !== "all" && t.status            !== filterStatus)   return false;
      if (filterPriority !== "all" && t.priority          !== filterPriority) return false;
      if (filterAgent    !== "all" && t.createdByAgent    !== filterAgent)    return false;
      if (filterAssignee === "ai"  && t.assignee.type     !== "agent")        return false;
      if (filterAssignee === "human" && t.assignee.type   !== "human")        return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterAgent, filterAssignee]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const total    = tasks.length;
  const pending  = tasks.filter(t => t.status === "pending").length;
  const inProg   = tasks.filter(t => t.status === "in-progress").length;
  const done     = tasks.filter(t => t.status === "done").length;
  const overdue  = tasks.filter(isOverdue).length;

  // ── Unique agents in the task list ───────────────────────────────────────
  const agentsInTasks = useMemo(() => {
    const ids = [...new Set(tasks.map(t => t.createdByAgent))].sort();
    return ids.map(id => ({ id, name: agentName(id) }));
  }, [tasks]);

  // ── Pill button helper ───────────────────────────────────────────────────
  const pill = (active: boolean, onClick: () => void, label: string, accent = "#00d4ff") =>
    <button
      key={label}
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border
        ${active
          ? "text-[#040d18] border-transparent shadow"
          : "text-slate-400 border-slate-700/40 hover:text-slate-200 hover:border-slate-600"}
      `}
      style={active ? { background: accent, boxShadow: `0 0 10px ${accent}40` } : {}}
    >
      {label}
    </button>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] flex items-center justify-center">
            <CheckSquare size={18} className="text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">My Tasks</h1>
            <p className="text-xs text-slate-500">Agent-created todos assigned to you or your team</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Total",        val: total,   colour: "text-slate-300"  },
            { label: "Pending",      val: pending, colour: "text-amber-400"  },
            { label: "In Progress",  val: inProg,  colour: "text-[#00d4ff]" },
            { label: "Done",         val: done,    colour: "text-[#10d6a0]" },
            ...(overdue > 0 ? [{ label: "Overdue", val: overdue, colour: "text-red-400" }] : []),
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-lg font-bold font-mono-jet ${s.colour}`}>{s.val}</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── View toggle + filters ───────────────────────────────────────────── */}
      <div className={`${GLASS} p-4 space-y-3`}>
        {/* View switcher */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
            {([
              { v: "list",    label: "List",     Icon: List        },
              { v: "kanban",  label: "Kanban",   Icon: Columns2    },
              { v: "calendar",label: "Calendar", Icon: CalendarDays },
            ] as { v: View; label: string; Icon: React.ElementType }[]).map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${view === v
                    ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] shadow-[inset_0_0_0_1px_rgba(0,212,255,0.2)]"
                    : "text-slate-500 hover:text-slate-300"}`}
              >
                <Icon size={13} />{label}
              </button>
            ))}
          </div>

          {/* Active filter count clear */}
          {(filterStatus !== "all" || filterPriority !== "all" || filterAgent !== "all" || filterAssignee !== "all") && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterAgent("all"); setFilterAssignee("all"); }}
              className="text-xs text-slate-500 hover:text-[#00d4ff] transition-colors"
            >
              × Clear filters
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={LABEL}>Status</span>
          {pill(filterStatus === "all",         () => setFilterStatus("all"),         "All")}
          {pill(filterStatus === "pending",     () => setFilterStatus("pending"),     "Pending",     "#f59e0b")}
          {pill(filterStatus === "in-progress", () => setFilterStatus("in-progress"), "In Progress", "#00d4ff")}
          {pill(filterStatus === "done",        () => setFilterStatus("done"),        "Done",        "#10d6a0")}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className={LABEL}>Priority</span>
          {pill(filterPriority === "all",    () => setFilterPriority("all"),    "All")}
          {pill(filterPriority === "high",   () => setFilterPriority("high"),   "High",   "#ef4444")}
          {pill(filterPriority === "medium", () => setFilterPriority("medium"), "Medium", "#f59e0b")}
          {pill(filterPriority === "low",    () => setFilterPriority("low"),    "Low",    "#475569")}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className={LABEL}>Created&nbsp;by</span>
          {pill(filterAgent === "all", () => setFilterAgent("all"), "All Agents")}
          {agentsInTasks.map(a =>
            pill(filterAgent === a.id, () => setFilterAgent(a.id), a.name, "#8b5cf6")
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className={LABEL}>Assignee</span>
          {pill(filterAssignee === "all",   () => setFilterAssignee("all"),   "All")}
          {pill(filterAssignee === "human", () => setFilterAssignee("human"), "Human", "#00d4ff")}
          {pill(filterAssignee === "ai",    () => setFilterAssignee("ai"),    "AI Agent", "#8b5cf6")}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin text-[#00d4ff]" />
          <span className="text-sm">Loading tasks…</span>
        </div>
      ) : (
        <>
          {view === "list"     && <ListView     tasks={filtered} onToggle={handleToggle} onAssign={handleAssign} />}
          {view === "kanban"   && <KanbanView   tasks={filtered} onMove={handleMove}     onAssign={handleAssign} />}
          {view === "calendar" && <CalendarView tasks={filtered} />}
        </>
      )}
    </div>
  );
}
