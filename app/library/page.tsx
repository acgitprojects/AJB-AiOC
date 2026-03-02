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
  document:     "bg-blue-100 text-blue-600",
  spreadsheet:  "bg-emerald-100 text-emerald-600",
  email:        "bg-violet-100 text-violet-600",
  presentation: "bg-orange-100 text-orange-600",
};

const categoryColors: Record<string, string> = {
  Reporting:   "bg-slate-100 text-slate-600",
  Sales:       "bg-blue-100 text-blue-700",
  Marketing:   "bg-pink-100 text-pink-700",
  Finance:     "bg-emerald-100 text-emerald-700",
  Operations:  "bg-amber-100 text-amber-700",
  HR:          "bg-purple-100 text-purple-700",
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Library</h1>
        <p className="text-sm text-slate-500 mt-0.5">Templates with version history</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Left — template list */}
        <div className="lg:w-72 shrink-0 space-y-3">
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
                  categoryFilter === c
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-slate-200 text-slate-600 hover:border-indigo-300"
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
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`p-2 rounded-lg shrink-0 ${typeColor[tmpl.type]}`}>
                    <TIcon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                      {tmpl.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[tmpl.category] || "bg-slate-100 text-slate-500"}`}>
                        {tmpl.category}
                      </span>
                      <span className="text-xs text-slate-400">{tmpl.versions.length} versions</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`mt-0.5 shrink-0 ${isSelected ? "text-indigo-500" : "text-slate-300"}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — template detail + versions */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <span className={`p-2.5 rounded-xl shrink-0 ${typeColor[selected.type]}`}>
                <Icon size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-800">{selected.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{selected.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[selected.category] || "bg-slate-100 text-slate-600"}`}>
                    {selected.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">
                    {selected.type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium flex items-center gap-1">
                    <GitBranch size={11} /> {selected.versions[0].version} (latest)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Version list */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Version History</h3>
              <button
                onClick={() => { setCompareMode(m => !m); setCompareA(null); setCompareB(null); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  compareMode
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600"
                }`}
              >
                <ArrowLeftRight size={13} />
                {compareMode ? "Comparing…" : "Compare versions"}
              </button>
            </div>

            {compareMode && (
              <div className="mb-4 bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 text-xs text-violet-700">
                {!compareA && "Click two versions below to compare them."}
                {compareA && !compareB && `Selected: ${compareA.version} — click another to compare`}
                {compareA && compareB && (
                  <span>Comparing <strong>{compareA.version}</strong> vs <strong>{compareB.version}</strong>
                    <button onClick={clearCompare} className="ml-3 underline">Clear</button>
                  </span>
                )}
              </div>
            )}

            {/* Compare placeholder */}
            {compareMode && compareA && compareB && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                {[compareA, compareB].map(v => (
                  <div key={v.version} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-slate-700 mb-1">{v.version}</p>
                    <p className="text-xs text-slate-500">Date: {v.date}</p>
                    <p className="text-xs text-slate-500">By: {v.author}</p>
                    <p className="text-xs text-slate-600 mt-2">{v.notes}</p>
                  </div>
                ))}
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
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
                      isA ? "border-violet-400 bg-violet-50"
                        : isB ? "border-blue-400 bg-blue-50"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0 w-16">
                      <GitBranch size={13} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{v.version}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">{v.notes}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={11} className="text-slate-300" />
                        <span className="text-xs text-slate-400">{v.date} · {v.author}</span>
                        {i === 0 && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Latest</span>}
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
