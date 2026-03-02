"use client";

import { useState } from "react";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  AGENTS, PERF_WEEKLY, PERF_MONTHLY, CALENDAR_TASKS,
  KANBAN_TASKS, PIPELINE_ITEMS,
  type KanbanTask, type PipelineItem,
} from "@/lib/mock-data";
import {
  TrendingUp, Users, CheckCircle, Zap,
  ChevronLeft, ChevronRight, ArrowRight,
  Circle, Clock, CheckCheck, Plus, Trash2, Image,
  GripVertical,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const statusDot: Record<string, string> = {
  online: "bg-emerald-400",
  idle: "bg-amber-400",
  offline: "bg-slate-400",
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

const pipelineColors: Record<string, string> = {
  idea: "bg-slate-100 text-slate-600",
  drafting: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  scheduled: "bg-violet-100 text-violet-700",
  published: "bg-emerald-100 text-emerald-700",
};

const kanbanCols: { key: KanbanTask["status"]; label: string; color: string }[] = [
  { key: "backlog",     label: "Backlog",     color: "border-slate-300" },
  { key: "in-progress", label: "In Progress", color: "border-blue-400" },
  { key: "review",      label: "Review",      color: "border-amber-400" },
  { key: "done",        label: "Done",        color: "border-emerald-400" },
];

const pipelineStages: PipelineItem["stage"][] = ["idea","drafting","review","scheduled","published"];

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        <p className="text-xs text-emerald-600 font-medium mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function Overview() {
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const data = range === "weekly" ? PERF_WEEKLY : PERF_MONTHLY;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tasks completed today" value="23" sub="+12% vs yesterday" icon={CheckCheck} color="bg-indigo-500" />
        <StatCard label="Active agents" value="8/10" sub="2 idle" icon={Users} color="bg-emerald-500" />
        <StatCard label="Avg response time" value="1.9s" sub="-0.3s vs last week" icon={Zap} color="bg-amber-500" />
        <StatCard label="AJC subscribers" value="34" sub="Target: 100 by end Mar" icon={TrendingUp} color="bg-violet-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Task Performance</h3>
          <div className="flex gap-1">
            {(["weekly","monthly"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  range === r ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >{r === "weekly" ? "7 days" : "4 weeks"}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="tasks" name="Total tasks" fill="#c7d2fe" radius={[4,4,0,0]} />
            <Bar dataKey="resolved" name="Resolved" fill="#4f46e5" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Agent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 text-left font-medium">Agent</th>
                <th className="pb-2 text-left font-medium">Role</th>
                <th className="pb-2 text-right font-medium">Done</th>
                <th className="pb-2 text-right font-medium">Response%</th>
                <th className="pb-2 text-right font-medium">Avg Resp</th>
                <th className="pb-2 text-left font-medium pl-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {AGENTS.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 font-medium text-slate-800">{a.name}</td>
                  <td className="py-2 text-slate-500 text-xs">{a.role}</td>
                  <td className="py-2 text-right">{a.tasksCompleted}</td>
                  <td className="py-2 text-right">
                    <span className={a.responseRate >= 95 ? "text-emerald-600" : a.responseRate >= 90 ? "text-amber-600" : "text-red-500"}>
                      {a.responseRate}%
                    </span>
                  </td>
                  <td className="py-2 text-right text-slate-500">{(a.avgResponseMs/1000).toFixed(1)}s</td>
                  <td className="py-2 pl-4">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusDot[a.status]}`} />
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

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView() {
  const today = new Date(2026, 2, 3); // March 3, 2026
  const [current, setCurrent] = useState(new Date(2026, 2, 1));
  const [selected, setSelected] = useState("2026-03-03");

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = current.toLocaleString("default", { month: "long", year: "numeric" });

  const pad = (d: number) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const tasks = CALENDAR_TASKS[selected] ?? [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 lg:w-80 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrent(new Date(year, month-1, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700">{monthName}</span>
          <button onClick={() => setCurrent(new Date(year, month+1, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div key={d} className="text-xs text-slate-400 pb-1">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
            const key = pad(d);
            const hasTasks = !!CALENDAR_TASKS[key];
            const isToday = d === 3 && month === 2 && year === 2026;
            const isSel = key === selected;
            return (
              <button
                key={d}
                onClick={() => setSelected(key)}
                className={`relative text-xs py-1.5 rounded-md transition-colors font-medium
                  ${isSel ? "bg-indigo-600 text-white" : isToday ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-700"}`}
              >
                {d}
                {hasTasks && !isSel && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          {new Date(selected + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        <p className="text-xs text-slate-400 mb-4">{tasks.length} task{tasks.length !== 1 ? "s" : ""} scheduled</p>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">No tasks on this day.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200">
                <div className="mt-0.5">
                  {t.status === "done" ? <CheckCheck size={16} className="text-emerald-500" />
                    : t.status === "in-progress" ? <Clock size={16} className="text-blue-500" />
                    : <Circle size={16} className="text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-slate-400" : "text-slate-700"}`}>{t.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Agent: {t.agent}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[t.priority]}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kanban ────────────────────────────────────────────────────────────────────

function TasksBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(KANBAN_TASKS);
  const [filter, setFilter] = useState("All");

  const agents = ["All", ...Array.from(new Set(KANBAN_TASKS.map(t => t.agent)))];

  const filtered = filter === "All" ? tasks : tasks.filter(t => t.agent === filter);

  const move = (id: string, to: KanbanTask["status"]) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: to } : t));
  };

  return (
    <div className="space-y-4">
      {/* Agent filter */}
      <div className="flex flex-wrap gap-2">
        {agents.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filter === a ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
            }`}
          >{a}</button>
        ))}
      </div>

      {/* Board — horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {kanbanCols.map(col => {
          const colTasks = filtered.filter(t => t.status === col.key);
          return (
            <div key={col.key} className={`shrink-0 w-64 lg:w-auto lg:flex-1 bg-slate-50 rounded-xl border-t-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{col.label}</h4>
                <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-500">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="text-slate-300 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-snug">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-xs text-slate-400">{task.agent}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{task.tag}</span>
                        </div>
                        {/* Move buttons */}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {kanbanCols
                            .filter(c => c.key !== col.key)
                            .map(c => (
                              <button
                                key={c.key}
                                onClick={() => move(task.id, c.key)}
                                className="text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
                              >
                                → {c.label}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-xs text-slate-300 text-center py-4">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile compact list view */}
      <div className="lg:hidden">
        <p className="text-xs text-slate-400 mb-2 font-medium">Compact view (grouped by status)</p>
        {kanbanCols.map(col => {
          const colTasks = filtered.filter(t => t.status === col.key);
          if (!colTasks.length) return null;
          return (
            <div key={col.key} className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{col.label} ({colTasks.length})</p>
              {colTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-xs text-slate-700 truncate max-w-[60%]">{t.title}</span>
                  <span className="text-xs text-slate-400">{t.agent}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Org Chart ─────────────────────────────────────────────────────────────────

function OrgChart() {
  const [confirmShutdown, setConfirmShutdown] = useState<string | null>(null);

  const ceo = AGENTS.find(a => a.id === "jary")!;
  const reports = AGENTS.filter(a => a.reportsTo === "jary");

  return (
    <div className="space-y-6">
      {/* CEO node */}
      <div className="flex justify-center">
        <div className="bg-white border-2 border-indigo-400 rounded-xl p-4 w-56 text-center shadow-sm">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">AC</div>
          <p className="text-sm font-bold text-slate-800">Andrew Cheung</p>
          <p className="text-xs text-indigo-600 font-medium">CEO</p>
          <p className="text-xs text-slate-400 mt-1">Upnext Tech · Jary AI</p>
        </div>
      </div>

      {/* Connector */}
      <div className="flex justify-center">
        <div className="w-0.5 h-8 bg-slate-200" />
      </div>

      {/* Jary node */}
      <div className="flex justify-center">
        <div className="bg-white border-2 border-indigo-300 rounded-xl p-4 w-56 text-center shadow-sm">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center mx-auto mb-2">JA</div>
          <p className="text-sm font-bold text-slate-800">{ceo.name}</p>
          <p className="text-xs text-indigo-600 font-medium">{ceo.role}</p>
          <span className={`inline-flex items-center gap-1 text-xs mt-1 ${statusDot[ceo.status]} rounded-full px-2 py-0.5 bg-slate-50 border border-slate-100`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[ceo.status]}`} /> {ceo.status}
          </span>
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {ceo.skills.map(s => <span key={s} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{s}</span>)}
          </div>
        </div>
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(agent => (
          <div key={agent.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-sm font-bold flex items-center justify-center shrink-0">
                  {agent.name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.role}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1 text-xs`}>
                <span className={`w-2 h-2 rounded-full ${statusDot[agent.status]}`} />
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">Model: {agent.model}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {agent.skills.map(s => <span key={s} className="text-xs bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">{s}</span>)}
            </div>
            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1">
                <Plus size={12} /> Add Skill
              </button>
              <button
                onClick={() => setConfirmShutdown(confirmShutdown === agent.id ? null : agent.id)}
                className="text-xs text-red-500 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Shutdown
              </button>
            </div>
            {confirmShutdown === agent.id && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                [UI-only] Shutdown {agent.name}? This would remove the agent from the gateway.
                <button onClick={() => setConfirmShutdown(null)} className="ml-2 underline">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Content Pipeline ──────────────────────────────────────────────────────────

function ContentPipeline() {
  const [items, setItems] = useState<PipelineItem[]>(PIPELINE_ITEMS);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addingImage, setAddingImage] = useState<string | null>(null);

  const moveStage = (id: string, dir: 1 | -1) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const idx = pipelineStages.indexOf(item.stage);
      const next = pipelineStages[Math.max(0, Math.min(pipelineStages.length - 1, idx + dir))];
      return { ...item, stage: next };
    }));
  };

  const saveEdit = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: editText } : i));
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {/* Stage overview */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {pipelineStages.map(stage => {
          const count = items.filter(i => i.stage === stage).length;
          return (
            <div key={stage} className="shrink-0 bg-white border border-slate-200 rounded-lg px-4 py-2 text-center min-w-[90px]">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pipelineColors[stage]}`}>{stage}</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {pipelineStages.map(stage => {
          const stageItems = items.filter(i => i.stage === stage);
          return (
            <div key={stage} className="shrink-0 w-64 lg:flex-1 lg:w-auto bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pipelineColors[stage]}`}>{stage}</span>
                <span className="text-xs text-slate-400">{stageItems.length}</span>
              </div>
              <div className="space-y-2">
                {stageItems.map(item => (
                  <div key={item.id} className="bg-white rounded-lg border border-slate-200 p-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="w-full h-24 object-cover rounded-md mb-2" />
                    )}
                    {editing === item.id ? (
                      <div className="space-y-1">
                        <input
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          className="w-full text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(item.id)} className="text-xs text-indigo-600 font-medium hover:underline">Save</button>
                          <button onClick={() => setEditing(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-xs font-medium text-slate-700 leading-snug cursor-pointer hover:text-indigo-600"
                        onClick={() => { setEditing(item.id); setEditText(item.title); }}
                      >{item.title}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-xs text-slate-400">{item.agent}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-xs text-slate-400">{item.product}</span>
                    </div>
                    {/* Image attach (client-side only) */}
                    {!item.imageUrl && (
                      <button
                        onClick={() => setAddingImage(addingImage === item.id ? null : item.id)}
                        className="mt-2 text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <Image size={12} /> Attach image
                      </button>
                    )}
                    {addingImage === item.id && (
                      <div className="mt-1 bg-slate-50 border border-dashed border-slate-300 rounded p-2 text-xs text-slate-400 text-center">
                        [Client-side only] Drop image here or click to browse
                        <button onClick={() => setAddingImage(null)} className="block mx-auto mt-1 text-indigo-500 hover:underline">Cancel</button>
                      </div>
                    )}
                    {/* Stage move */}
                    <div className="flex gap-1 mt-2">
                      {pipelineStages.indexOf(item.stage) > 0 && (
                        <button onClick={() => moveStage(item.id, -1)} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-0.5">
                          ← Back
                        </button>
                      )}
                      {pipelineStages.indexOf(item.stage) < pipelineStages.length - 1 && (
                        <button onClick={() => moveStage(item.id, 1)} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 ml-auto">
                          Advance <ArrowRight size={10} />
                        </button>
                      )}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",  label: "Overview" },
  { key: "calendar",  label: "Calendar" },
  { key: "board",     label: "Tasks Board" },
  { key: "orgchart",  label: "Org Chart" },
  { key: "pipeline",  label: "Content Pipeline" },
];

export default function DashboardPage() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Agent Management — AJB Ops Centre</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 border-b border-slate-200 pb-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === "overview"  && <Overview />}
      {tab === "calendar"  && <CalendarView />}
      {tab === "board"     && <TasksBoard />}
      {tab === "orgchart"  && <OrgChart />}
      {tab === "pipeline"  && <ContentPipeline />}
    </div>
  );
}
