"use client";

import { useState, useRef, useEffect } from "react";
import { AGENTS, MOCK_RESPONSES } from "@/lib/mock-data";
import {
  Send, Bot, FileText, Image, FileSpreadsheet,
  Presentation, Download, Loader2, Sparkles,
} from "lucide-react";

// ── Chat ──────────────────────────────────────────────────────────────────────

type Message = { id: string; role: "user" | "agent"; text: string; agent?: string; ts: string };

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

  const send = () => {
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

    setTimeout(() => {
      const lower = userMsg.text.toLowerCase();
      const key = lower.includes("ajc") ? "ajc"
        : lower.includes("digest") ? "digest"
        : lower.includes("help") ? "help"
        : "default";
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        text: MOCK_RESPONSES[key],
        agent: agent.name,
        ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, reply]);
      setLoading(false);
    }, 900 + Math.random() * 600);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] lg:h-[600px]">
      {/* Agent selector */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Agent:</span>
        {AGENTS.slice(0, 6).map(a => (
          <button
            key={a.id}
            onClick={() => setAgent(a)}
            className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
              agent.id === a.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-300"
            }`}
          >{a.name}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
              ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
              {m.role === "user" ? "AC" : (m.agent || agent.name).slice(0, 2).toUpperCase()}
            </div>
            <div className={`max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
              <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-slate-100 text-slate-800 rounded-tl-sm"
              }`}>{m.text}</div>
              <span className="text-xs text-slate-400">{m.ts}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-100 flex items-center gap-1">
              <Loader2 size={14} className="animate-spin text-slate-400" />
              <span className="text-xs text-slate-400">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Message ${agent.name}…`}
          className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl px-4 py-2.5 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Create Document ───────────────────────────────────────────────────────────

const DOC_TYPES = [
  { key: "word",  label: "Word Document",  icon: FileText,        ext: ".docx", color: "bg-blue-100 text-blue-600" },
  { key: "excel", label: "Spreadsheet",    icon: FileSpreadsheet, ext: ".xlsx", color: "bg-emerald-100 text-emerald-600" },
  { key: "ppt",   label: "Presentation",   icon: Presentation,    ext: ".pptx", color: "bg-orange-100 text-orange-600" },
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
    <div className="space-y-5 max-w-2xl">
      {/* Type selector */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">Document Type</p>
        <div className="flex gap-3 flex-wrap">
          {DOC_TYPES.map(dt => (
            <button
              key={dt.key}
              onClick={() => setDocType(dt)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors text-sm font-medium ${
                docType.key === dt.key
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
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
        <p className="text-xs text-slate-500 font-medium mb-2">What should the agent create?</p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder={`e.g. "Monthly finance report for March 2026 with P&L, cashflow, and invoice aging sections"`}
          className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>

      <button
        onClick={generate}
        disabled={generating || !prompt.trim()}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {generating ? "Generating…" : `Generate ${docType.label}`}
      </button>

      {result && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">{result}</pre>
          <button className="mt-3 flex items-center gap-2 text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
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
      setMockUrl(`https://placehold.co/${dim}/4f46e5/ffffff?text=Mock+Output`);
      setGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">Image Prompt</p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          placeholder={`e.g. "Professional hero image for AJC landing page — modern AI assistant, clean blue tones"`}
          className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">Style</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_STYLES.map(s => (
              <button key={s} onClick={() => setStyle(s)}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                  style === s ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_SIZES.map(s => (
              <button key={s} onClick={() => setSize(s)}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                  size === s ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:border-indigo-300"
                }`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={generating || !prompt.trim()}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
        {generating ? "Generating…" : "Generate Image"}
      </button>

      {generating && (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl h-48 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Loader2 size={28} className="animate-spin mx-auto mb-2" />
            <p className="text-xs">Generating image…</p>
          </div>
        </div>
      )}
      {mockUrl && (
        <div className="space-y-2">
          <img src={mockUrl} alt="Mock output" className="rounded-xl border border-slate-200 w-full max-h-80 object-contain bg-slate-50" />
          <p className="text-xs text-slate-400">Mock output — prompt: "{prompt}" · {style} · {size}</p>
          <button className="flex items-center gap-2 text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Agent</h1>
        <p className="text-sm text-slate-500 mt-0.5">Chat, generate documents and images</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-500 border-transparent hover:text-slate-700"
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
