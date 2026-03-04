"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, Clock, Tag, X, Edit2, Bot, User,
} from "lucide-react";
import type { MyTask, TaskAssignee, TaskPatch, Agent } from "@ajb/contract";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

// ─── Constants ────────────────────────────────────────────────────────────────

export const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";

const PRIORITY_CFG = {
  high:   { label: "High",   colour: "#ef4444", bg: "bg-red-500/10    text-red-400    border-red-500/20"    },
  medium: { label: "Medium", colour: "#f59e0b", bg: "bg-amber-500/10  text-amber-400  border-amber-500/20"  },
  low:    { label: "Low",    colour: "#475569", bg: "bg-slate-700/40  text-slate-400  border-slate-600/30"  },
} as const;

const STATUS_CFG = {
  pending:       { label: "Pending",     icon: Circle,       badge: "bg-slate-700/40  text-slate-400  border-slate-600/30"  },
  "in-progress": { label: "In Progress", icon: Clock,        badge: "bg-cyan-500/10   text-cyan-400   border-cyan-500/20"   },
  done:          { label: "Done",        icon: CheckCircle2, badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  delegated:     { label: "Delegated",   icon: Clock,        badge: "bg-yellow-500/10  text-yellow-400  border-yellow-500/20" },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(task: MyTask) {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate) < new Date();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Task detail modal ────────────────────────────────────────────────────────

export function TaskDetailModal({ task, agents, agentName, onClose, onPatched }: {
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
