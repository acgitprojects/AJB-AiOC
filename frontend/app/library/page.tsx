"use client";

import { useState } from "react";
import { TEMPLATES, type Template, type TemplateVersion } from "@/lib/mock-data";
import {
  FileText, FileSpreadsheet, Mail, Presentation,
  Clock, GitBranch, ChevronRight, ArrowLeftRight,
} from "lucide-react";

const typeIcon: Record<Template["type"], React.ElementType> = {
  document:     FileText,
  spreadsheet:  FileSpreadsheet,
  email:        Mail,
  presentation: Presentation,
};

const typeColor: Record<Template["type"], string> = {
  document:     "bg-blue-500/15 text-blue-400",
  spreadsheet:  "bg-emerald-500/15 text-emerald-400",
  email:        "bg-violet-500/15 text-violet-400",
  presentation: "bg-orange-500/15 text-orange-400",
};

const categoryColors: Record<string, string> = {
  Reporting:   "bg-slate-700/50 text-slate-300",
  Sales:       "bg-blue-500/15 text-blue-300",
  Marketing:   "bg-pink-500/15 text-pink-300",
  Finance:     "bg-emerald-500/15 text-emerald-300",
  Operations:  "bg-amber-500/15 text-amber-300",
  HR:          "bg-purple-500/15 text-purple-300",
};

export default function LibraryPage() {
  const [selected, setSelected] = useState<Template>(TEMPLATES[0]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<TemplateVersion | null>(null);
  const [compareB, setCompareB] = useState<TemplateVersion | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(TEMPLATES.map(t => t.category)))];
  const filtered = categoryFilter === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === categoryFilter);

  const selectVersion = (v: TemplateVersion) => {
    if (!compareMode) return;
    if (!compareA) { setCompareA(v); return; }
    if (compareA.version === v.version) { setCompareA(null); return; }
    setCompareB(v);
  };

  const clearCompare = () => {
    setCompareA(null);
    setCompareB(null);
    setCompareMode(false);
  };

  const Icon = typeIcon[selected.type];

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Template <span className="text-arc-cyan">Library</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Templates with version history and compare mode</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Left — template list */}
        <div className="lg:w-72 shrink-0 space-y-2.5">
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 text-xs rounded-full font-medium border transition-all duration-200 ${
                  categoryFilter === c
                    ? "bg-arc-cyan/20 text-arc-cyan border-arc-cyan/60 shadow-[0_0_8px_rgba(0,212,255,0.3)]"
                    : "border-navy-700 text-slate-400 hover:border-arc-cyan/40 hover:text-arc-cyan/70"
                }`}
              >{c}</button>
            ))}
          </div>

          {filtered.map(tmpl => {
            const TIcon = typeIcon[tmpl.type];
            const isSelected = selected.id === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => { setSelected(tmpl); clearCompare(); }}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "border-arc-cyan/60 bg-arc-cyan/5 shadow-[inset_2px_0_0_#00d4ff]"
                    : "border-navy-700 bg-navy-900/30 hover:border-navy-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`p-2 rounded-lg shrink-0 ${typeColor[tmpl.type]}`}>
                    <TIcon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-arc-cyan" : "text-slate-200"}`}>
                      {tmpl.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[tmpl.category] || "bg-navy-800 text-slate-500"}`}>
                        {tmpl.category}
                      </span>
                      <span className="text-xs text-slate-600">{tmpl.versions.length} versions</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`mt-0.5 shrink-0 transition-colors ${isSelected ? "text-arc-cyan" : "text-slate-700"}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — template detail + versions */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header card */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className={`p-2.5 rounded-xl shrink-0 ${typeColor[selected.type]}`}>
                <Icon size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">{selected.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{selected.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[selected.category] || "bg-navy-800 text-slate-500"}`}>
                    {selected.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-navy-800 text-slate-400 font-medium capitalize border border-navy-700">
                    {selected.type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-arc-cyan/10 text-arc-cyan font-medium flex items-center gap-1 border border-arc-cyan/20">
                    <GitBranch size={11} /> {selected.versions[0].version} (latest)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Version list */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Version History</h3>
              <button
                onClick={() => { setCompareMode(m => !m); setCompareA(null); setCompareB(null); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-200 ${
                  compareMode
                    ? "bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-[0_0_8px_rgba(167,139,250,0.3)]"
                    : "border-navy-700 text-slate-400 hover:border-violet-500/40 hover:text-violet-300"
                }`}
              >
                <ArrowLeftRight size={13} />
                {compareMode ? "Comparing…" : "Compare versions"}
              </button>
            </div>

            {compareMode && (
              <div className="mb-4 bg-violet-500/10 border border-violet-500/30 rounded-lg px-4 py-2.5 text-xs text-violet-300">
                {!compareA && "Click two versions below to compare them."}
                {compareA && !compareB && `Selected: ${compareA.version} — click another to compare`}
                {compareA && compareB && (
                  <span>Comparing <strong>{compareA.version}</strong> vs <strong>{compareB.version}</strong>
                    <button onClick={clearCompare} className="ml-3 underline opacity-70 hover:opacity-100">Clear</button>
                  </span>
                )}
              </div>
            )}

            {/* Compare placeholder panels */}
            {compareMode && compareA && compareB && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                {[compareA, compareB].map(v => (
                  <div key={v.version} className="bg-navy-900/60 border border-navy-700 rounded-lg p-3">
                    <p className="text-xs font-bold text-slate-200 mb-1 font-mono-jet">{v.version}</p>
                    <p className="text-xs text-slate-500">Date: {v.date}</p>
                    <p className="text-xs text-slate-500">By: {v.author}</p>
                    <p className="text-xs text-slate-400 mt-2">{v.notes}</p>
                  </div>
                ))}
                <div className="col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400">
                  [Comparison placeholder] A full diff view would show line-by-line changes between {compareA.version} and {compareB.version} in production.
                </div>
              </div>
            )}

            <div className="space-y-2">
              {selected.versions.map((v, i) => {
                const isA = compareA?.version === v.version;
                const isB = compareB?.version === v.version;
                return (
                  <div
                    key={v.version}
                    onClick={() => selectVersion(v)}
                    className={`flex items-start gap-4 p-3 rounded-lg border transition-all cursor-pointer ${
                      isA ? "border-violet-500/60 bg-violet-500/10"
                        : isB ? "border-blue-500/60 bg-blue-500/10"
                        : "border-navy-700/50 hover:border-navy-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0 w-16">
                      <GitBranch size={13} className="text-slate-600" />
                      <span className="text-xs font-bold font-mono-jet text-slate-300">{v.version}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 leading-snug">{v.notes}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={11} className="text-slate-700" />
                        <span className="text-xs text-slate-600">{v.date} · {v.author}</span>
                        {i === 0 && <span className="text-xs bg-arc-cyan/10 text-arc-cyan border border-arc-cyan/20 px-1.5 py-0.5 rounded font-medium">Latest</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
