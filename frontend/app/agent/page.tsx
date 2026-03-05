"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { OcAgent, DocumentJob } from "@ajb/contract";
import { OpenClawWSClient } from "@/lib/openclaw";
import type { WSFrame } from "@/lib/openclaw";
import {
  Send, Bot, FileText, Image, FileSpreadsheet,
  Presentation, Download, Sparkles, Wifi, WifiOff, RotateCcw, Settings,
} from "lucide-react";

// ── Chat ──────────────────────────────────────────────────────────────────────

type Message = { id: string; role: "user" | "agent"; text: string; agent?: string; ts: string };

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-arc-cyan animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function normalizeHistoryMessage(raw: unknown): Message | null {
  const m = raw as { role?: string; content?: Array<{type: string; text?: string}> | string; timestamp?: number };
  if (m.role !== "user" && m.role !== "assistant") return null;
  const role = m.role === "assistant" ? "agent" : "user";
  let text = "";
  if (typeof m.content === "string") text = m.content;
  else if (Array.isArray(m.content))
    text = m.content.filter(c => c.type === "text").map(c => c.text ?? "").join("");
  if (!text || /^\s*NO_REPLY\s*$/.test(text)) return null;
  return {
    id: crypto.randomUUID(), role, text,
    ts: m.timestamp
      ? new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "",
  };
}

function Chat({ ocAgents, agentsLoading }: { ocAgents: OcAgent[]; agentsLoading: boolean }) {
  const [agent, setAgent]             = useState<OcAgent | null>(null);
  const [agentMessages, setAgentMessages] = useState<Map<string, Message[]>>(new Map());
  const [input, setInput] = useState("");
  const [loadingAgents, setLoadingAgents] = useState<Set<string>>(new Set());
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const clientRef        = useRef<OpenClawWSClient | null>(null);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const agentRef         = useRef<OcAgent | null>(null);
  const streamingTextRef     = useRef<Map<string, string>>(new Map());
  const loadedAgentsRef      = useRef<Set<string>>(new Set());
  const activeSessionKeyRef  = useRef<Map<string, string>>(new Map());

  const messages = agentMessages.get(agent?.id ?? "") ?? [];
  const loading  = loadingAgents.has(agent?.id ?? "");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep agentRef in sync so handleEvent can read current agent without deps
  useEffect(() => { agentRef.current = agent; }, [agent]);

  // ── Set default agent when list loads ────────────────────────────────────
  useEffect(() => {
    if (!agent && ocAgents.length > 0) setAgent(ocAgents[0]);
  }, [ocAgents, agent]);

  // ── WebSocket lifecycle ──────────────────────────────────────────────────
  const handleEvent = useCallback((frame: WSFrame) => {
    if (frame.event !== "chat") return;

    const payload = frame.payload as {
      sessionKey?: string;
      state: "delta" | "final" | "aborted" | "error";
      message?: { role: string; content: Array<{ type: string; text: string }>; timestamp: number } | null;
      errorMessage?: string;
    } | undefined;
    if (!payload) return;

    // Filter events to the current agent's session (mirrors OpenClaw UI handleChatEvent)
    if (payload.sessionKey && agentRef.current && (
        !payload.sessionKey.startsWith(`agent:${agentRef.current.id}:`) ||
        payload.sessionKey.includes(":doc-")
    )) return;

    const extractText = (msg: typeof payload.message): string => {
      if (!msg) return "";
      if (Array.isArray(msg.content)) {
        return msg.content
          .filter(c => c.type === "text")
          .map(c => c.text)
          .join("");
      }
      return "";
    };

    const agentId = agentRef.current?.id ?? "";

    if (payload.state === "delta") {
      // Delta events are cumulative (replace, not append) — mirrors OpenClaw UI chat controller
      const next = extractText(payload.message);
      const cur = streamingTextRef.current.get(agentId) ?? "";
      if (next && next.length >= cur.length) {
        streamingTextRef.current.set(agentId, next);
      }
      return;
    }

    if (payload.state === "final") {
      const text = extractText(payload.message) || (streamingTextRef.current.get(agentId) ?? "");
      streamingTextRef.current.delete(agentId);
      if (text) {
        setAgentMessages(prev => {
          const existing = prev.get(agentId) ?? [];
          return new Map(prev).set(agentId, [...existing, {
            id:    crypto.randomUUID(),
            role:  "agent",
            text,
            agent: agentRef.current?.name ?? agentRef.current?.id ?? "",
            ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          }]);
        });
      }
      setLoadingAgents(prev => { const s = new Set(prev); s.delete(agentId); return s; });
      return;
    }

    if (payload.state === "aborted" || payload.state === "error") {
      streamingTextRef.current.delete(agentId);
      setAgentMessages(prev => {
        const existing = prev.get(agentId) ?? [];
        return new Map(prev).set(agentId, [...existing, {
          id:    crypto.randomUUID(),
          role:  "agent",
          text:  `⚠️ ${payload.errorMessage ?? payload.state}`,
          agent: agentRef.current?.name ?? agentRef.current?.id ?? "",
          ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        }]);
      });
      setLoadingAgents(prev => { const s = new Set(prev); s.delete(agentId); return s; });
    }
  }, []); // stable — reads agent via ref to avoid WS reconnect on agent switch

  useEffect(() => {
    const wsUrl   = `${window.location.protocol.replace("http", "ws")}//${window.location.host}/api/ws`;
    const wsToken = "";   // auth is handled server-side in the proxy

    const client = new OpenClawWSClient({
      wsUrl,
      wsToken,
      onEvent: handleEvent,
      onClose: () => setWsStatus("disconnected"),
    });
    clientRef.current = client;

    client.connect()
      .then(() => setWsStatus("connected"))
      .catch(() => setWsStatus("disconnected"));

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [handleEvent]);

  // ── Load history on agent switch ─────────────────────────────────────────
  useEffect(() => {
    if (!agent || wsStatus !== "connected" || !clientRef.current) return;
    if (loadedAgentsRef.current.has(agent.id)) return;
    loadedAgentsRef.current.add(agent.id);
    if (!activeSessionKeyRef.current.has(agent.id)) {
      activeSessionKeyRef.current.set(agent.id, `agent:${agent.id}:main`);
    }
    const sessionKey = activeSessionKeyRef.current.get(agent.id)!;

    clientRef.current.request<{ messages?: unknown[] }>(
      "chat.history",
      { sessionKey, limit: 200 }
    ).then(frame => {
      if (!frame.ok || !frame.payload?.messages) return;
      const msgs = frame.payload.messages
        .map(normalizeHistoryMessage)
        .filter(Boolean) as Message[];
      setAgentMessages(prev => new Map(prev).set(agent.id, msgs));
    }).catch(() => {}); // degrade gracefully if OpenClaw unavailable
  }, [agent, wsStatus]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || loading || wsStatus !== "connected" || !agent) return;

    const agentId = agent.id;
    const userMsg: Message = {
      id:   crypto.randomUUID(),
      role: "user",
      text,
      ts:   new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
    setAgentMessages(prev => {
      const existing = prev.get(agentId) ?? [];
      return new Map(prev).set(agentId, [...existing, userMsg]);
    });
    setInput("");
    setLoadingAgents(prev => new Set(prev).add(agentId));
    streamingTextRef.current.delete(agentId);

    try {
      const sessionKey = activeSessionKeyRef.current.get(agentId) ?? `agent:${agentId}:main`;
      const res = await clientRef.current!.sendMessage(text, { agentId, sessionKey });
      if (!res.ok) {
        const payload = res.payload as Record<string, unknown> | undefined;
        const errMsg: Message = {
          id:    crypto.randomUUID(),
          role:  "agent",
          text:  `⚠️ ${(payload?.error as string) ?? "Gateway not ready"}`,
          agent: agent?.name ?? agent?.id ?? "",
          ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        };
        setAgentMessages(prev => {
          const existing = prev.get(agentId) ?? [];
          return new Map(prev).set(agentId, [...existing, errMsg]);
        });
        setLoadingAgents(prev => { const s = new Set(prev); s.delete(agentId); return s; });
      }
      // ok: true → reply arrives via onEvent callback above
    } catch {
      const errMsg: Message = {
        id:    crypto.randomUUID(),
        role:  "agent",
        text:  "⚠️ Unable to send message. Check your connection.",
        agent: agent?.name ?? agent?.id ?? "",
        ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setAgentMessages(prev => {
        const existing = prev.get(agentId) ?? [];
        return new Map(prev).set(agentId, [...existing, errMsg]);
      });
      setLoadingAgents(prev => { const s = new Set(prev); s.delete(agentId); return s; });
    }
  };

  const handleNewSession = () => {
    if (!agent || loading) return;
    const agentId = agent.id;
    const newKey = `agent:${agentId}:${Date.now()}`;
    activeSessionKeyRef.current.set(agentId, newKey);
    setAgentMessages(prev => new Map(prev).set(agentId, []));
    streamingTextRef.current.delete(agentId);
    setLoadingAgents(prev => { const s = new Set(prev); s.delete(agentId); return s; });
    loadedAgentsRef.current.delete(agentId);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] lg:h-[620px]">
      {/* Agent selector + WS status */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Agent:</span>
        {agentsLoading
          ? <span className="text-xs text-slate-500 animate-pulse">Loading agents…</span>
          : ocAgents.map(a => (
              <button key={a.id} onClick={() => setAgent(a)}
                className={`px-3 py-1 text-xs rounded-full font-medium border transition-all duration-200 ${
                  agent?.id === a.id
                    ? "bg-arc-cyan/20 text-arc-cyan border-arc-cyan shadow-[0_0_8px_rgba(0,212,255,0.35)]"
                    : "border-navy-700 text-slate-400 hover:border-arc-cyan/50 hover:text-arc-cyan/80"
                }`}
              >{a.emoji ? `${a.emoji} ` : ""}{a.name ?? a.id}</button>
            ))
        }
        <button
          onClick={handleNewSession}
          disabled={!agent || loading}
          title="New session"
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-navy-700
            text-slate-400 hover:border-arc-cyan/50 hover:text-arc-cyan/80 transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw size={11} />
          New session
        </button>
        <span className="flex items-center gap-1.5 text-xs">
          {wsStatus === "connected"
            ? <><Wifi size={12} className="text-emerald-400" /><span className="text-emerald-400">Live</span></>
            : wsStatus === "connecting"
            ? <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /><span className="text-amber-400">Connecting…</span></>
            : <><WifiOff size={12} className="text-red-400" /><span className="text-red-400">Disconnected</span></>
          }
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-navy-700 bg-navy-950/60 backdrop-blur-sm p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold font-mono-jet
              ${m.role === "user"
                ? "bg-violet-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                : "bg-navy-800 text-arc-cyan border border-arc-cyan/30 shadow-[0_0_8px_rgba(0,212,255,0.2)]"
              }`}>
              {m.role === "user" ? "AC" : (m.agent || agent?.name || agent?.id || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className={`max-w-[75%] flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`px-3.5 py-2.5 rounded-xl text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-600/80 text-white rounded-tr-sm shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  : "bg-navy-800/80 text-slate-200 rounded-tl-sm border border-navy-700/60"
              }`}>{m.text}</div>
              <span className="text-xs text-slate-600">{m.ts}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-800 border border-arc-cyan/30 flex items-center justify-center text-xs font-bold font-mono-jet text-arc-cyan shadow-[0_0_8px_rgba(0,212,255,0.2)]">
              {(agent?.name ?? agent?.id ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="bg-navy-800/80 border border-navy-700/60 rounded-xl rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={wsStatus === "connected" && agent ? `Message ${agent.name ?? agent.id}…` : "Connecting…"}
          disabled={wsStatus !== "connected" || !agent}
          className="flex-1 text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600
            focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim() || wsStatus !== "connected" || !agent}
          className="bg-arc-cyan/20 hover:bg-arc-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed
            text-arc-cyan border border-arc-cyan/50 hover:border-arc-cyan hover:shadow-glow-cyan
            rounded-xl px-4 py-2.5 transition-all duration-200"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Create Document ───────────────────────────────────────────────────────────

const DOC_TYPES = [
  { key: "word"  as const, label: "Word Doc",     icon: FileText,        ext: ".docx", color: "bg-blue-500/20 text-blue-400",       border: "border-blue-500/50" },
  { key: "excel" as const, label: "Spreadsheet",  icon: FileSpreadsheet, ext: ".xlsx", color: "bg-emerald-500/20 text-emerald-400", border: "border-emerald-500/50" },
  { key: "ppt"   as const, label: "Presentation", icon: Presentation,    ext: ".pptx", color: "bg-orange-500/20 text-orange-400",   border: "border-orange-500/50" },
];

const MIME_TYPES: Record<string, string> = {
  word:  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt:   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-slate-700/40 text-slate-400",
  processing: "bg-amber-500/20 text-amber-400 animate-pulse",
  completed:  "bg-emerald-500/20 text-emerald-400",
  failed:     "bg-red-500/20 text-red-400",
};

function downloadJob(job: DocumentJob) {
  const bytes = Uint8Array.from(atob(job.fileDataB64!), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: MIME_TYPES[job.type] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = job.fileName!;
  a.click();
  URL.revokeObjectURL(url);
}

function CreateDocument({ ocAgents }: { ocAgents: OcAgent[] }) {
  const [docType,    setDocType]    = useState(DOC_TYPES[0]);
  const [prompt,     setPrompt]     = useState("");
  const [title,      setTitle]      = useState("");
  const [agentId,    setAgentId]    = useState(ocAgents[0]?.id ?? "");
  const [jobs,       setJobs]       = useState<DocumentJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr,  setSubmitErr]  = useState<string | null>(null);

  // Skills setup state
  const [skillAgentId,  setSkillAgentId]  = useState(ocAgents[0]?.id ?? "");
  const [skillResult,   setSkillResult]   = useState<string | null>(null);
  const [skillWorking,  setSkillWorking]  = useState(false);

  // Keep agentId in sync when agents load
  useEffect(() => {
    if (!agentId && ocAgents.length > 0) setAgentId(ocAgents[0].id);
    if (!skillAgentId && ocAgents.length > 0) setSkillAgentId(ocAgents[0].id);
  }, [ocAgents, agentId, skillAgentId]);

  // Poll jobs every 2s
  useEffect(() => {
    const fetchJobs = async () => {
      const res = await apiClient.documents.list().catch(() => null);
      if (res?.status === 200) setJobs(res.body);
    };
    fetchJobs();
    const timer = setInterval(fetchJobs, 2000);
    return () => clearInterval(timer);
  }, []);

  const submit = async () => {
    if (!prompt.trim() || !agentId || submitting) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await apiClient.documents.create({
        body: {
          type: docType.key,
          title: title.trim() || undefined,
          prompt: prompt.trim(),
          agentId,
        },
      });
      if (res.status === 201) {
        setJobs(prev => [res.body, ...prev]);
        setPrompt("");
        setTitle("");
      } else {
        setSubmitErr("Failed to create document job");
      }
    } catch {
      setSubmitErr("Network error");
    }
    setSubmitting(false);
  };

  const installSkills = async () => {
    if (!skillAgentId || skillWorking) return;
    setSkillWorking(true);
    setSkillResult(null);
    try {
      const res = await apiClient.openclaw.agents.installSkills({
        params: { id: skillAgentId },
      });
      if (res.status === 200) {
        setSkillResult("Skills installed successfully.");
      } else {
        setSkillResult(`Failed: ${(res.body as { error?: string }).error ?? "unknown error"}`);
      }
    } catch {
      setSkillResult("Network error installing skills");
    }
    setSkillWorking(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Type selector */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-widest">Document Type</p>
        <div className="flex gap-3 flex-wrap">
          {DOC_TYPES.map(dt => (
            <button
              key={dt.key}
              onClick={() => setDocType(dt)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium
                ${docType.key === dt.key
                  ? `${dt.border} ${dt.color} shadow-[0_0_12px_rgba(0,212,255,0.15)]`
                  : "border-navy-700 text-slate-400 hover:border-navy-600 bg-navy-900/40"
                }`}
            >
              <span className={`p-1.5 rounded-lg ${dt.color}`}><dt.icon size={16} /></span>
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent picker */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-widest">Agent</p>
        <select
          value={agentId}
          onChange={e => setAgentId(e.target.value)}
          className="text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-3 py-2 text-slate-200
            focus:outline-none focus:border-arc-cyan/60 transition-all"
        >
          {ocAgents.map(a => (
            <option key={a.id} value={a.id}>{a.emoji ? `${a.emoji} ` : ""}{a.name ?? a.id}</option>
          ))}
          {ocAgents.length === 0 && <option value="">No agents available</option>}
        </select>
      </div>

      {/* Title */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-widest">Title (optional)</p>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={`e.g. "Q1 Finance Report"`}
          className="w-full text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600
            focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all"
        />
      </div>

      {/* Prompt */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-widest">What should the agent create?</p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder={`e.g. "Monthly finance report for March 2026 with P&L, cashflow, and invoice aging sections"`}
          className="w-full text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 resize-none
            focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all"
        />
      </div>

      <button
        onClick={submit}
        disabled={submitting || !prompt.trim() || !agentId}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200
          ${submitting || !prompt.trim() || !agentId
            ? "bg-navy-800 text-slate-600 cursor-not-allowed border border-navy-700"
            : "bg-arc-cyan/20 text-arc-cyan border border-arc-cyan/50 hover:bg-arc-cyan/30 hover:shadow-glow-cyan"
          }`}
      >
        {submitting
          ? <><span className="w-4 h-4 border-2 border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin" /> Submitting…</>
          : <><Sparkles size={16} /> Generate {docType.label}</>
        }
      </button>

      {submitErr && (
        <p className="text-xs text-red-400 font-mono-jet">{submitErr}</p>
      )}

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Document Jobs</p>
          {jobs.map(job => {
            const dt = DOC_TYPES.find(d => d.key === job.type) ?? DOC_TYPES[0];
            const lastMsg = job.agentMessages.at(-1);
            return (
              <div key={job.id} className="rounded-xl border border-navy-700 bg-navy-900/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${dt.color}`}><dt.icon size={14} /></span>
                  <span className="text-sm font-medium text-slate-200 flex-1 truncate">
                    {job.fileName ?? job.title ?? `${dt.label} job`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[job.status]}`}>
                    {job.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{job.prompt}</p>
                {lastMsg && (
                  <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-2">
                    {lastMsg.text}
                  </p>
                )}
                {job.status === "failed" && job.errorMsg && (
                  <p className="text-xs text-red-400 font-mono-jet">{job.errorMsg}</p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => downloadJob(job)}
                    disabled={job.status !== "completed" || !job.fileDataB64}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all duration-200
                      border-arc-cyan/50 text-arc-cyan hover:bg-arc-cyan/10
                      disabled:opacity-30 disabled:cursor-not-allowed disabled:border-navy-700 disabled:text-slate-600"
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Skills Setup */}
      <details className="border border-navy-700 rounded-xl p-4">
        <summary className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <Settings size={12} /> Agent Skills Setup
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">
            Install document skills into an agent&apos;s workspace so it understands how to format replies for document generation.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={skillAgentId}
              onChange={e => setSkillAgentId(e.target.value)}
              className="text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-3 py-2 text-slate-200
                focus:outline-none focus:border-arc-cyan/60 transition-all flex-1"
            >
              {ocAgents.map(a => (
                <option key={a.id} value={a.id}>{a.emoji ? `${a.emoji} ` : ""}{a.name ?? a.id}</option>
              ))}
              {ocAgents.length === 0 && <option value="">No agents available</option>}
            </select>
            <button
              onClick={installSkills}
              disabled={skillWorking || !skillAgentId}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-arc-cyan/50 text-arc-cyan
                hover:bg-arc-cyan/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {skillWorking
                ? <><span className="w-3 h-3 border border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin" /> Installing…</>
                : "Install Skills"
              }
            </button>
          </div>
          {skillResult && (
            <p className={`text-xs font-mono-jet ${skillResult.startsWith("Skills") ? "text-emerald-400" : "text-red-400"}`}>
              {skillResult}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

// ── Create Image ──────────────────────────────────────────────────────────────

const IMAGE_STYLES = ["Photorealistic", "Flat illustration", "Infographic", "Corporate", "Minimalist"];
const IMAGE_SIZES  = ["1024×1024", "1792×1024 (landscape)", "1024×1792 (portrait)"];

function CreateImage() {
  const [prompt,     setPrompt]     = useState("");
  const [style,      setStyle]      = useState(IMAGE_STYLES[0]);
  const [size,       setSize]       = useState(IMAGE_SIZES[0]);
  const [generating, setGenerating] = useState(false);
  const [result,     setResult]     = useState<{ ok: boolean; message: string } | null>(null);

  const generate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate an image for me:\n\nPrompt: ${prompt}\nStyle: ${style}\nSize: ${size}\n\nPlease create this image and return the URL or attach it to your reply.`,
          agentId: "maya",
        }),
      });
      if (res.ok || res.status === 202) {
        setResult({ ok: true, message: `Request sent to Maya. Switch to the Chat tab — Maya will reply with your image shortly.` });
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setResult({ ok: false, message: `Failed to reach agent: ${body.error ?? res.status}` });
      }
    } catch {
      setResult({ ok: false, message: "Network error — could not reach the OpenClaw gateway." });
    }
    setGenerating(false);
  };

  const chipCls = (active: boolean) =>
    `px-3 py-1 text-xs rounded-full border font-medium transition-all duration-200 ${
      active
        ? "bg-violet-500/20 text-violet-300 border-violet-500/60 shadow-[0_0_8px_rgba(167,139,250,0.3)]"
        : "border-navy-700 text-slate-400 hover:border-violet-500/40 hover:text-violet-300/70"
    }`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-widest">Image Prompt</p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          placeholder={`e.g. "Professional hero image for AJC landing page — modern AI assistant, clean blue tones"`}
          className="w-full text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 resize-none
            focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-widest">Style</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_STYLES.map(s => <button key={s} onClick={() => setStyle(s)} className={chipCls(style === s)}>{s}</button>)}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-widest">Size</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_SIZES.map(s => <button key={s} onClick={() => setSize(s)} className={chipCls(size === s)}>{s}</button>)}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={generating || !prompt.trim()}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200
          ${generating || !prompt.trim()
            ? "bg-navy-800 text-slate-600 cursor-not-allowed border border-navy-700"
            : "bg-violet-500/20 text-violet-300 border border-violet-500/50 hover:bg-violet-500/30 hover:shadow-[0_0_12px_rgba(167,139,250,0.4)]"
          }`}
      >
        {generating
          ? <><span className="w-4 h-4 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" /> Generating…</>
          : <><Image size={16} /> Generate Image</>
        }
      </button>

      {generating && (
        <div className="border border-dashed border-navy-700 rounded-xl h-48 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <span className="block w-8 h-8 border-2 border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Generating image…</p>
          </div>
        </div>
      )}
      {result && (
        <div className={`glass rounded-xl p-4 animate-fade-in border ${
          result.ok ? "border-[#10d6a0]/30" : "border-red-500/30"
        }`}>
          <p className={`text-xs font-mono-jet ${
            result.ok ? "text-[#10d6a0]" : "text-red-400"
          }`}>{result.message}</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "chat",     label: "Chat",            icon: Bot },
  { key: "document", label: "Create Document", icon: FileText },
  { key: "image",    label: "Create Image",    icon: Image },
];

export default function AgentPage() {
  const [tab, setTab] = useState("chat");
  const [ocAgents, setOcAgents]       = useState<OcAgent[]>([]);
  const [agentsLoading, setAgLoading] = useState(true);

  useEffect(() => {
    apiClient.openclaw.agents.list()
      .then(res => {
        if (res.status === 200) setOcAgents(res.body);
      })
      .finally(() => setAgLoading(false));
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Agent <span className="text-arc-cyan">Console</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Chat with agents · generate documents and images</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-navy-800 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-200 ${
              tab === t.key
                ? "text-arc-cyan border-arc-cyan drop-shadow-[0_0_6px_rgba(0,212,255,0.7)]"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat"     && <Chat ocAgents={ocAgents} agentsLoading={agentsLoading} />}
      {tab === "document" && <CreateDocument ocAgents={ocAgents} />}
      {tab === "image"    && <CreateImage />}
    </div>
  );
}
