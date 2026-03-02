"use client";

import { useState, useRef, useEffect } from "react";
import { AGENTS } from "@/lib/mock-data";
import type { ChatRequest, ChatResponse } from "@/app/api/chat/route";
import {
  Send, Bot, FileText, Image, FileSpreadsheet,
  Presentation, Download, Sparkles,
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input.trim(),
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const payload: ChatRequest = {
        message:    userMsg.text,
        agentId:    agent.id,
        sessionKey: `webchat:${agent.id}`,
      };
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data: ChatResponse = await res.json();
      const reply: Message = {
        id:    (Date.now() + 1).toString(),
        role:  "agent",
        text:  data.reply,
        agent: agent.name,
        ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, reply]);
    } catch {
      const errMsg: Message = {
        id:    (Date.now() + 1).toString(),
        role:  "agent",
        text:  "⚠️ Unable to reach the agent. Check that the OpenClaw gateway is running.",
        agent: agent.name,
        ts:    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] lg:h-[620px]">
      {/* Agent selector */}
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
          placeholder={`Message ${agent.name}…`}
          className="flex-1 text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600
            focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
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
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setResult(null);
    setTimeout(() => {
      setResult(`✅ [Mock Output] ${docType.label} generated\n\nTitle: "${prompt}"\nFormat: ${docType.ext}\nPages: ${Math.floor(Math.random() * 8) + 2}\nGenerated by: Maya\n\nThis is a UI-only placeholder. In production, the agent would generate the actual file and return a download link.`);
      setGenerating(false);
    }, 1800);
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
        <div className="glass rounded-xl p-4 border-arc-cyan/20 animate-fade-in">
          <pre className="text-xs text-arc-cyan/80 whitespace-pre-wrap font-mono-jet">{result}</pre>
          <button className="mt-3 flex items-center gap-2 text-xs text-arc-cyan border border-arc-cyan/30 rounded-lg px-3 py-1.5 hover:bg-arc-cyan/10 transition-colors">
            <Download size={13} /> Download (placeholder)
          </button>
        </div>
      )}
    </div>
  );
}

// ── Create Image ──────────────────────────────────────────────────────────────

const IMAGE_STYLES = ["Photorealistic", "Flat illustration", "Infographic", "Corporate", "Minimalist"];
const IMAGE_SIZES  = ["1024×1024", "1792×1024 (landscape)", "1024×1792 (portrait)"];

function CreateImage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(IMAGE_STYLES[0]);
  const [size, setSize] = useState(IMAGE_SIZES[0]);
  const [generating, setGenerating] = useState(false);
  const [mockUrl, setMockUrl] = useState<string | null>(null);

  const generate = () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setMockUrl(null);
    setTimeout(() => {
      const dim = size.includes("landscape") ? "800x450" : size.includes("portrait") ? "450x800" : "600x600";
      setMockUrl(`https://placehold.co/${dim}/0a1e35/00d4ff?text=Mock+Output`);
      setGenerating(false);
    }, 2000);
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
      {mockUrl && (
        <div className="space-y-2 animate-fade-in">
          <img src={mockUrl} alt="Mock output" className="rounded-xl border border-navy-700 w-full max-h-80 object-contain bg-navy-950" />
          <p className="text-xs text-slate-600">Mock output — prompt: "{prompt}" · {style} · {size}</p>
          <button className="flex items-center gap-2 text-xs text-violet-300 border border-violet-500/30 rounded-lg px-3 py-1.5 hover:bg-violet-500/10 transition-colors">
            <Download size={13} /> Download (placeholder)
          </button>
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
