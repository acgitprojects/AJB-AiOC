"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CheckSquare, List, Columns2, CalendarDays, Bot, User,
  CheckCircle2, Circle, Clock, ChevronDown, ChevronRight,
  AlertCircle, ChevronLeft, Tag, Loader2, X, Plus, Edit2,
} from "lucide-react";
import type { MyTask, TaskAssignee, TaskPatch, TaskCreate, Agent } from "@ajb/contract";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

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
  agents,
}: {
  task: MyTask;
  onAssign: (assignee: TaskAssignee) => void;
  agents: Agent[];
}) {
  const [open, setOpen] = useState(false);

  const humans: TaskAssignee[] = [
    { type: "human", id: "andrew", name: "Andrew (Me)" },
    { type: "human", id: "team",   name: "Team" },
  ];
  const agentAssignees: TaskAssignee[] = agents.map(a => ({
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
          className="absolute right-0 bottom-7 z-[200] w-48 rounded-xl border border-[rgba(0,212,255,0.12)] bg-[#0a1628] shadow-xl p-1 animate-fade-in"
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

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Assignee picker (shared by modals) ──────────────────────────────────────

function AssigneePicker({ value, onChange, agents }: { value: TaskAssignee; onChange: (a: TaskAssignee) => void; agents: Agent[] }) {
  const humans: TaskAssignee[] = [
    { type: "human", id: "andrew", name: "Andrew (Me)" },
    { type: "human", id: "team",   name: "Team" },
  ];
  const all = [...humans, ...agents.map(a => ({ type: "agent" as const, id: a.id, name: a.name }))];
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map(a => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
            value.id === a.id
              ? "border-[rgba(0,212,255,0.4)] bg-[rgba(0,212,255,0.08)] text-[#00d4ff]"
              : "border-slate-700/40 text-slate-500 hover:text-slate-300"
          }`}
        >
          {a.type === "agent" ? <Bot size={10} className="text-violet-400" /> : <User size={10} className="text-cyan-400" />}
          {a.name}
        </button>
      ))}
    </div>
  );
}

// ─── Create task modal ────────────────────────────────────────────────────────

function CreateTaskModal({ agents, onClose, onCreated }: {
  agents: Agent[];
  onClose: () => void;
  onCreated: (t: MyTask) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [priority, setPriority]         = useState<MyTask["priority"]>("medium");
  const [status, setStatus]             = useState<MyTask["status"]>("pending");
  const [dueDate, setDueDate]           = useState("");
  const [tags, setTags]                 = useState("");
  const [createdByAgent, setCreatedByAgent] = useState(agents[0]?.id ?? "");
  const [assignee, setAssignee]         = useState<TaskAssignee>({ type: "human", id: "andrew", name: "Andrew (Me)" });
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body: TaskCreate = {
        title: title.trim(),
        description: description.trim() || undefined,
        createdByAgent,
        assignee,
        priority,
        status,
        dueDate: dueDate || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      const res = await apiClient.tasks.create({ body });
      if (res.status === 201) {
        toast("Task created", "success");
        onCreated(res.body);
        onClose();
      } else {
        setError("Failed to create task");
        toast("Failed to create task", "error");
      }
    } catch {
      setError("Failed to create task");
      toast("Failed to create task", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className={LABEL}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
            placeholder="Task title…"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
            placeholder="Optional description…"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Priority</label>
          <div className="flex gap-2">
            {(["high", "medium", "low"] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  priority === p ? PRIORITY_CFG[p].bg : "border-slate-700/40 text-slate-500 hover:text-slate-300"
                }`}
              >
                {PRIORITY_CFG[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as MyTask["status"])}
            className="w-full bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="delegated">Delegated</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Assignee</label>
          <AssigneePicker value={assignee} onChange={setAssignee} agents={agents} />
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Created by agent</label>
          <select
            value={createdByAgent}
            onChange={e => setCreatedByAgent(e.target.value)}
            className="w-full bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
          >
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
            placeholder="e.g. urgent, review, bug"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.2)] transition-colors disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Task detail modal ────────────────────────────────────────────────────────

function TaskDetailModal({ task, agents, agentName, onClose, onPatched }: {
  task: MyTask;
  agents: Agent[];
  agentName: (id: string) => string;
  onClose: () => void;
  onPatched: (t: MyTask) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing]           = useState(false);
  const [title, setTitle]               = useState(task.title);
  const [description, setDescription]   = useState(task.description ?? "");
  const [priority, setPriority]         = useState(task.priority);
  const [status, setStatus]             = useState(task.status);
  const [dueDate, setDueDate]           = useState(task.dueDate?.slice(0, 10) ?? "");
  const [tags, setTags]                 = useState(task.tags.join(", "));
  const [assignee, setAssignee]         = useState<TaskAssignee>(task.assignee);
  const [saving, setSaving]             = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: TaskPatch = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        status,
        dueDate: dueDate || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        assignee,
      };
      const res = await apiClient.tasks.patch({ params: { id: task.id }, body });
      if (res.status === 200) {
        toast("Task saved", "success");
        onPatched(res.body);
        setEditing(false);
      } else {
        toast("Failed to save", "error");
      }
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Modal title="Edit Task" onClose={onClose}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className={LABEL}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Priority</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    priority === p ? PRIORITY_CFG[p].bg : "border-slate-700/40 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {PRIORITY_CFG[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MyTask["status"])}
              className="w-full bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
              <option value="delegated">Delegated</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Assignee</label>
            <AssigneePicker value={assignee} onChange={setAssignee} agents={agents} />
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
              placeholder="e.g. urgent, review, bug"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.2)] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // View mode
  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <PriorityBadge p={task.priority} />
            <StatusBadge s={task.status} />
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-100 border border-slate-700/40 hover:border-slate-600 transition-all"
          >
            <Edit2 size={12} /> Edit
          </button>
        </div>

        {task.description && (
          <p className="text-sm text-slate-400 leading-relaxed">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className={LABEL}>Assignee</p>
            <AssigneeBadge a={task.assignee} />
          </div>
          <div className="space-y-1">
            <p className={LABEL}>Created by</p>
            <p className="text-xs text-slate-400 font-mono-jet">{agentName(task.createdByAgent)}</p>
          </div>
          {task.dueDate && (
            <div className="space-y-1">
              <p className={LABEL}>Due date</p>
              <p className={`text-xs ${isOverdue(task) ? "text-red-400" : "text-slate-400"}`}>
                {fmtDate(task.dueDate)}
                {isOverdue(task) && " — Overdue"}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className={LABEL}>Created at</p>
            <p className="text-xs text-slate-500 font-mono-jet">{fmtDate(task.createdAt)}</p>
          </div>
          {task.updatedAt && (
            <div className="space-y-1">
              <p className={LABEL}>Updated at</p>
              <p className="text-xs text-slate-500 font-mono-jet">{fmtDate(task.updatedAt)}</p>
            </div>
          )}
        </div>

        {task.tags.length > 0 && (
          <div className="space-y-1">
            <p className={LABEL}>Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(t => (
                <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-slate-800/60 text-slate-400 border border-slate-700/30">
                  <Tag size={9} />{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {task.delegations && task.delegations.length > 0 && (
          <div className="space-y-1.5">
            <p className={LABEL}>Delegations</p>
            {task.delegations.map((d, i) => (
              <div key={i} className="rounded-lg border border-[rgba(255,255,255,0.06)] px-3 py-2 text-xs text-slate-500 space-y-0.5">
                <p>{d.from} → {d.to}</p>
                {d.reason && <p className="text-slate-600">{d.reason}</p>}
                <p className="font-mono-jet">{d.status} · {fmtDate(d.proposedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Task row (list view) ─────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onAssign,
  onDetail,
  agents,
}: {
  task: MyTask;
  onToggle: (id: string, current: MyTask["status"]) => void;
  onAssign: (id: string, assignee: TaskAssignee) => void;
  onDetail: (task: MyTask) => void;
  agents: Agent[];
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
          <button
            onClick={() => onDetail(task)}
            className={`text-sm font-medium text-left hover:text-[#00d4ff] transition-colors ${task.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}
          >
            {task.title}
          </button>
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
        <AssignDropdown task={task} onAssign={(a) => onAssign(task.id, a)} agents={agents} />
      </div>
    </div>
  );
}

// ─── Kanban card ─────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  onMove,
  onAssign,
  onDetail,
  agents,
  agentName,
}: {
  task: MyTask;
  onMove: (id: string, status: MyTask["status"]) => void;
  onAssign: (id: string, assignee: TaskAssignee) => void;
  onDetail: (task: MyTask) => void;
  agents: Agent[];
  agentName: (id: string) => string;
}) {
  const overdue = isOverdue(task);
  const others = KANBAN_COLS.filter(c => c.key !== task.status);

  return (
    <div className="group/card glass rounded-xl p-4 shadow-card space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PriorityDot p={task.priority} />
          <button
            onClick={() => onDetail(task)}
            className={`text-sm font-medium text-left leading-snug hover:text-[#00d4ff] transition-colors ${task.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}
          >
            {task.title}
          </button>
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
          <AssignDropdown task={task} onAssign={(a) => onAssign(task.id, a)} agents={agents} />
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
  onDetail,
  agents,
  agentName,
  agentInitials,
}: {
  tasks: MyTask[];
  onToggle: (id: string, s: MyTask["status"]) => void;
  onAssign: (id: string, a: TaskAssignee) => void;
  onDetail: (task: MyTask) => void;
  agents: Agent[];
  agentName: (id: string) => string;
  agentInitials: (id: string) => string;
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
          <div key={agentId} className={GLASS}>
            {/* Group header */}
            <button
              onClick={() => toggle(agentId)}
              className="rounded-t-xl w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
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
                  <TaskRow key={t.id} task={t} onToggle={onToggle} onAssign={onAssign} onDetail={onDetail} agents={agents} />
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
  onDetail,
  agents,
  agentName,
}: {
  tasks: MyTask[];
  onMove: (id: string, s: MyTask["status"]) => void;
  onAssign: (id: string, a: TaskAssignee) => void;
  onDetail: (task: MyTask) => void;
  agents: Agent[];
  agentName: (id: string) => string;
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
                  <KanbanCard key={t.id} task={t} onMove={onMove} onAssign={onAssign} onDetail={onDetail} agents={agents} agentName={agentName} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ tasks, agentName }: { tasks: MyTask[]; agentName: (id: string) => string }) {
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
  const { toast } = useToast();
  const [tasks,   setTasks]   = useState<MyTask[]>([]);
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<View>("list");

  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAgent,    setFilterAgent]    = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  const [createOpen, setCreateOpen]   = useState(false);
  const [detailTask, setDetailTask]   = useState<MyTask | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([apiClient.tasks.list(), apiClient.agents.list()])
      .then(([tasksRes, agentsRes]) => {
        if (tasksRes.status === 200) setTasks(tasksRes.body);
        if (agentsRes.status === 200) setAgents(agentsRes.body);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────
  const patchTask = useCallback(async (id: string, patch: Partial<MyTask>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    try {
      const { status, priority, title, description, dueDate, assignee, tags } = patch;
      const body: TaskPatch = {
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate }),
        ...(assignee !== undefined && { assignee }),
        ...(tags !== undefined && { tags }),
      };
      await apiClient.tasks.patch({ params: { id }, body });
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

  const handleDetail = useCallback((task: MyTask) => {
    setDetailTask(task);
  }, []);

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

  // ── Agent helpers ────────────────────────────────────────────────────────
  const agentMap = useMemo(
    () => Object.fromEntries(agents.map(a => [a.id, a.name])),
    [agents]
  );
  const agentName = (id: string) => agentMap[id] ?? id;
  const agentInitials = (id: string) => {
    const n = agentName(id);
    return n.length >= 2 ? n.slice(0, 2).toUpperCase() : n.toUpperCase();
  };

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

        {/* Stats row + New Task button */}
        <div className="flex items-center gap-4 flex-wrap">
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
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.18)] transition-all"
          >
            <Plus size={15} /> New Task
          </button>
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
          {view === "list"     && <ListView     tasks={filtered} onToggle={handleToggle} onAssign={handleAssign} onDetail={handleDetail} agents={agents} agentName={agentName} agentInitials={agentInitials} />}
          {view === "kanban"   && <KanbanView   tasks={filtered} onMove={handleMove}     onAssign={handleAssign} onDetail={handleDetail} agents={agents} agentName={agentName} />}
          {view === "calendar" && <CalendarView tasks={filtered} agentName={agentName} />}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {createOpen && (
        <CreateTaskModal
          agents={agents}
          onClose={() => setCreateOpen(false)}
          onCreated={(t) => { setTasks(prev => [t, ...prev]); setCreateOpen(false); }}
        />
      )}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          agents={agents}
          agentName={agentName}
          onClose={() => setDetailTask(null)}
          onPatched={(t) => { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); setDetailTask(t); }}
        />
      )}
    </div>
  );
}
