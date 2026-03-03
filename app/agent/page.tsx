"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AGENTS } from "@/lib/mock-data";
import { OpenClawWSClient } from "@/lib/openclaw";
import type { WSFrame } from "@/lib/openclaw";
import {
  Send, Bot, FileText, Image, FileSpreadsheet,
  Presentation, Download, Sparkles, Wifi, WifiOff,
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

function Chat() {
  const [agent, setAgent] = useState(AGENTS[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "agent",
      text: "Hi Andrew. I'm Jary — your executive assistant. What do you need?",
      agent: "Jary",
      ts: "09:00",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const clientRef = useRef<OpenClawWSClient | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── WebSocket lifecycle ──────────────────────────────────────────────────
  const handleEvent = useCallback((frame: WSFrame) => {
    if (frame.event === "chat.reply") {
      const payload = frame.payload as Record<string, unknown> | undefined;
      const text = (payload?.message as string) ?? (payload?.text as string) ?? JSON.stringify(payload);
      const reply: Message = {
        id:    crypto.randomUUID(),
        role:  "agent",
        text,
        agent: agent.name,
        ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, reply]);
      setLoading(false);
    }
  }, [agent.name]);

  useEffect(() => {
    const wsUrl   = process.env.NEXT_PUBLIC_OPENCLAW_WS_URL   ?? "ws://localhost:18789";
    const wsToken = process.env.NEXT_PUBLIC_OPENCLAW_WS_TOKEN ?? "";

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

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || loading || wsStatus !== "connected") return;

    const userMsg: Message = {
      id:   crypto.randomUUID(),
      role: "user",
      text,
      ts:   new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      await clientRef.current!.sendMessage(text, { agentId: agent.id });
      // Reply will arrive via onEvent callback above
    } catch {
      const errMsg: Message = {
        id:    crypto.randomUUID(),
        role:  "agent",
        text:  "⚠️ Unable to send message. Check your connection.",
        agent: agent.name,
        ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, errMsg]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] lg:h-[620px]">
      {/* Agent selector + WS status */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Agent:</span>
        {AGENTS.slice(0, 6).map(a => (
          <button
            key={a.id}
            onClick={() => setAgent(a)}
            className={`px-3 py-1 text-xs rounded-full font-medium border transition-all duration-200 ${
              agent.id === a.id
                ? "bg-arc-cyan/20 text-arc-cyan border-arc-cyan shadow-[0_0_8px_rgba(0,212,255,0.35)]"
                : "border-navy-700 text-slate-400 hover:border-arc-cyan/50 hover:text-arc-cyan/80"
            }`}
          >{a.name}</button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs">
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
              {m.role === "user" ? "AC" : (m.agent || agent.name).slice(0, 2).toUpperCase()}
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
              {agent.name.slice(0, 2).toUpperCase()}
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
          placeholder={wsStatus === "connected" ? `Message ${agent.name}…` : "Connecting to agent…"}
          disabled={wsStatus !== "connected"}
          className="flex-1 text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600
            focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim() || wsStatus !== "connected"}
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
  { key: "word",  label: "Word Doc",     icon: FileText,        ext: ".docx", color: "bg-blue-500/20 text-blue-400",    border: "border-blue-500/50" },
  { key: "excel", label: "Spreadsheet",  icon: FileSpreadsheet, ext: ".xlsx", color: "bg-emerald-500/20 text-emerald-400", border: "border-emerald-500/50" },
  { key: "ppt",   label: "Presentation", icon: Presentation,    ext: ".pptx", color: "bg-orange-500/20 text-orange-400", border: "border-orange-500/50" },
];

function CreateDocument() {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [prompt,     setPrompt]     = useState("");
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
          message: `Create a ${docType.label} (${docType.ext}) for me:\n\n${prompt}\n\nFormat it professionally, include all relevant sections, and return the content clearly structured.`,
          agentId: "maya",
        }),
      });
      if (res.ok || res.status === 202) {
        setResult({ ok: true, message: `Request sent to Maya. Switch to the Chat tab — Maya will reply with your ${docType.label} shortly.` });
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setResult({ ok: false, message: `Failed to reach agent: ${body.error ?? res.status}` });
      }
    } catch {
      setResult({ ok: false, message: "Network error — could not reach the OpenClaw gateway." });
    }
    setGenerating(false);
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
              <span className={`p-1.5 rounded-lg ${dt.color}`}>
                <dt.icon size={16} />
              </span>
              {dt.label}
            </button>
          ))}
        </div>
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
        onClick={generate}
        disabled={generating || !prompt.trim()}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200
          ${generating || !prompt.trim()
            ? "bg-navy-800 text-slate-600 cursor-not-allowed border border-navy-700"
            : "bg-arc-cyan/20 text-arc-cyan border border-arc-cyan/50 hover:bg-arc-cyan/30 hover:shadow-glow-cyan"
          }`}
      >
        {generating
          ? <><span className="w-4 h-4 border-2 border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin" /> Generating…</>
          : <><Sparkles size={16} /> Generate {docType.label}</>
        }
      </button>

      {result && (
        <div className={`glass rounded-xl p-4 animate-fade-in border ${
          result.ok ? "border-[#10d6a0]/30" : "border-red-500/30"
        }`}>
          <p className={`text-xs whitespace-pre-wrap font-mono-jet ${
            result.ok ? "text-[#10d6a0]" : "text-red-400"
          }`}>{result.message}</p>
        </div>
      )}
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

      {tab === "chat"     && <Chat />}
      {tab === "document" && <CreateDocument />}
      {tab === "image"    && <CreateImage />}
    </div>
  );
}
