"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, Circle, Clock, Tag, X, Edit2, Bot, User,
  MessageSquare, Paperclip, Trash2, Download, Upload, Link2,
  FileText, FileSpreadsheet, Presentation, File,
} from "lucide-react";
import type { MyTask, TaskAssignee, TaskPatch, Agent, TaskComment, TaskFile, DocumentJob } from "@ajb/contract";
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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isOverdue(task: MyTask) {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate) < new Date();
}

function fileIcon(fileType: string) {
  if (fileType.includes("word"))         return FileText;
  if (fileType.includes("sheet") || fileType.includes("excel")) return FileSpreadsheet;
  if (fileType.includes("presentation") || fileType.includes("ppt")) return Presentation;
  return File;
}

function downloadFile(f: TaskFile) {
  const bytes = Uint8Array.from(atob(f.fileDataB64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: f.fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.fileName;
  a.click();
  URL.revokeObjectURL(url);
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

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab({ taskId, agents }: { taskId: string; agents: Agent[] }) {
  const { toast } = useToast();
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [content, setContent]   = useState("");
  const [authorType, setAuthorType] = useState<"human" | "agent">("human");
  const [authorId, setAuthorId]   = useState("andrew");
  const [authorName, setAuthorName] = useState("Andrew (Me)");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.tasks.comments.list({ params: { id: taskId } }).then(res => {
      if (res.status === 200) setComments(res.body);
    });
  }, [taskId]);

  const humans = [
    { id: "andrew", name: "Andrew (Me)" },
    { id: "team",   name: "Team" },
  ];

  const handleAuthorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "andrew" || val === "team") {
      setAuthorType("human");
      setAuthorId(val);
      setAuthorName(val === "andrew" ? "Andrew (Me)" : "Team");
    } else {
      const agent = agents.find(a => a.id === val);
      setAuthorType("agent");
      setAuthorId(val);
      setAuthorName(agent?.name ?? val);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiClient.tasks.comments.create({
        params: { id: taskId },
        body: { content: content.trim(), authorType, authorId, authorName },
      });
      if (res.status === 201) {
        setComments(prev => [...(prev ?? []), res.body]);
        setContent("");
        toast("Comment added", "success");
      }
    } catch {
      toast("Failed to add comment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const res = await apiClient.tasks.comments.delete({ params: { id: taskId, commentId } });
    if (res.status === 200) {
      setComments(prev => (prev ?? []).filter(c => c.id !== commentId));
    }
  };

  if (comments === null) {
    return <div className="text-xs text-slate-600 py-4 text-center">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 && (
        <p className="text-xs text-slate-600 text-center py-4">No comments yet.</p>
      )}
      {comments.map(c => (
        <div key={c.id} className="rounded-lg border border-[rgba(255,255,255,0.06)] px-3 py-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-300">
              {c.authorType === "agent"
                ? <Bot size={11} className="text-violet-400" />
                : <User size={11} className="text-cyan-400" />}
              {c.authorName}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-mono-jet">{fmtDateTime(c.createdAt)}</span>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-slate-700 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{c.content}</p>
        </div>
      ))}

      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <label className={LABEL + " shrink-0"}>Author</label>
          <select
            value={authorId}
            onChange={handleAuthorChange}
            className="flex-1 bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
          >
            {humans.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            {agents.map(a => <option key={a.id} value={a.id}>{a.name} (agent)</option>)}
          </select>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder="Write a comment…"
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.2)] transition-colors disabled:opacity-40"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Files tab ────────────────────────────────────────────────────────────────

function FilesTab({ taskId }: { taskId: string }) {
  const { toast } = useToast();
  const [files, setFiles]         = useState<TaskFile[] | null>(null);
  const [documents, setDocuments] = useState<DocumentJob[] | null>(null);
  const [linkDocId, setLinkDocId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linking, setLinking]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.tasks.files.list({ params: { id: taskId } }).then(res => {
      if (res.status === 200) setFiles(res.body);
    });
    apiClient.documents.list({}).then(res => {
      if (res.status === 200) {
        setDocuments(res.body.filter((d: DocumentJob) => d.status === "completed" && d.fileDataB64));
      }
    });
  }, [taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const currentCount = files?.length ?? 0;
    if (currentCount + selected.length > 12) {
      toast(`Cannot upload: would exceed 12-file limit`, "error");
      return;
    }
    setUploading(true);
    try {
      for (const file of selected) {
        const fileDataB64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await apiClient.tasks.files.upload({
          params: { id: taskId },
          body: {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSizeBytes: file.size,
            fileDataB64,
            uploadedBy: "andrew",
            uploadedByName: "Andrew (Me)",
          },
        });
        if (res.status === 201) {
          setFiles(prev => [...(prev ?? []), res.body]);
        } else if (res.status === 400) {
          toast(res.body.error, "error");
          break;
        }
      }
      toast("Uploaded", "success");
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    const res = await apiClient.tasks.files.delete({ params: { id: taskId, fileId } });
    if (res.status === 200) {
      setFiles(prev => (prev ?? []).filter(f => f.id !== fileId));
    }
  };

  const handleLinkDocument = async () => {
    if (!linkDocId) return;
    setLinking(true);
    try {
      const res = await apiClient.tasks.files.linkDocument({
        params: { id: taskId },
        body: { documentJobId: linkDocId },
      });
      if (res.status === 201) {
        setFiles(prev => [...(prev ?? []), res.body]);
        setLinkDocId("");
        toast("Document linked", "success");
      } else if (res.status === 400) {
        toast(res.body.error, "error");
      }
    } catch {
      toast("Failed to link document", "error");
    } finally {
      setLinking(false);
    }
  };

  if (files === null) {
    return <div className="text-xs text-slate-600 py-4 text-center">Loading…</div>;
  }

  const atLimit = files.length >= 12;

  return (
    <div className="flex flex-col gap-3">
      {files.length === 0 && (
        <p className="text-xs text-slate-600 text-center py-4">No files attached.</p>
      )}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {files.map(f => {
            const Icon = fileIcon(f.fileType);
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.06)] px-3 py-2">
                <Icon size={20} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{f.fileName}</p>
                  <p className="text-xs text-slate-600">
                    {f.uploadedByName} · {fmtDate(f.createdAt)}
                    {f.fileSizeBytes ? ` · ${fmtBytes(f.fileSizeBytes)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => downloadFile(f)}
                    className="p-1 rounded text-slate-500 hover:text-[#00d4ff] transition-colors"
                    title="Download"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 space-y-2">
        {atLimit && (
          <p className="text-xs text-amber-400 text-center">12-file limit reached.</p>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || atLimit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-100 border border-slate-700/40 hover:border-slate-600 transition-all disabled:opacity-40"
          >
            <Upload size={12} />
            {uploading ? "Uploading…" : "Upload files"}
          </button>
        </div>

        {documents && documents.length > 0 && (
          <div className="flex gap-2 items-center">
            <select
              value={linkDocId}
              onChange={e => setLinkDocId(e.target.value)}
              disabled={atLimit}
              className="flex-1 bg-[#0a1628] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)] disabled:opacity-40"
            >
              <option value="">Link a document…</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title ?? d.fileName ?? d.id} ({d.type})
                </option>
              ))}
            </select>
            <button
              onClick={handleLinkDocument}
              disabled={!linkDocId || linking || atLimit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-100 border border-slate-700/40 hover:border-slate-600 transition-all disabled:opacity-40 shrink-0"
            >
              <Link2 size={12} />
              {linking ? "Linking…" : "Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
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
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "files">("details");
  const [editing, setEditing]           = useState(false);
  const [title, setTitle]               = useState(task.title);
  const [description, setDescription]   = useState(task.description ?? "");
  const [priority, setPriority]         = useState(task.priority);
  const [status, setStatus]             = useState(task.status);
  const [dueDate, setDueDate]           = useState(task.dueDate?.slice(0, 10) ?? "");
  const [tags, setTags]                 = useState(task.tags.join(", "));
  const [assignee, setAssignee]         = useState<TaskAssignee>(task.assignee);
  const [saving, setSaving]             = useState(false);

  // lazy-loaded counts for tab badges
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [fileCount, setFileCount]       = useState<number | null>(null);

  useEffect(() => {
    // preload counts for badges
    apiClient.tasks.comments.list({ params: { id: task.id } }).then(r => {
      if (r.status === 200) setCommentCount(r.body.length);
    });
    apiClient.tasks.files.list({ params: { id: task.id } }).then(r => {
      if (r.status === 200) setFileCount(r.body.length);
    });
  }, [task.id]);

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

  const tabBtn = (tab: "details" | "comments" | "files", label: string, count: number | null) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        activeTab === tab
          ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]"
          : "text-slate-500 hover:text-slate-300 border border-transparent"
      }`}
    >
      {label}
      {count !== null && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab ? "bg-[rgba(0,212,255,0.2)]" : "bg-slate-800"}`}>
          {count}
        </span>
      )}
    </button>
  );

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

  return (
    <Modal title={task.title} onClose={onClose}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        {tabBtn("details", "Details", null)}
        {tabBtn("comments", "Comments", commentCount)}
        {tabBtn("files", "Files", fileCount)}
      </div>

      {/* Details tab */}
      {activeTab === "details" && (
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
      )}

      {/* Comments tab */}
      {activeTab === "comments" && (
        <CommentsTab
          taskId={task.id}
          agents={agents}
          key={task.id}
        />
      )}

      {/* Files tab */}
      {activeTab === "files" && (
        <FilesTab taskId={task.id} key={task.id} />
      )}
    </Modal>
  );
}
