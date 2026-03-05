"use client";

import { apiClient } from "@/lib/api-client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import type { OcAgent, OcModel } from "@ajb/contract";
import { useToast } from "@/lib/toast";

const GLASS = "glass glass-hover rounded-xl p-5 shadow-card";
const MONO  = "font-mono-jet";
const LABEL = "text-xs text-slate-500 font-medium uppercase tracking-widest";
const INPUT = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[rgba(0,212,255,0.4)]";

export default function OrgPage() {
  const { toast } = useToast();
  const [ocAgents, setOcAgents] = useState<OcAgent[]>([]);
  const [ocModels, setOcModels] = useState<OcModel[]>([]);
  const [ocLoading, setOcLoading] = useState(true);
  const [newId, setNewId] = useState("");
  const [newModel, setNewModel] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<OcAgent | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [newProvider, setNewProvider] = useState("");
  const [editFields, setEditFields] = useState<{ name: string; emoji: string; model: string; provider: string }>({ name: "", emoji: "", model: "", provider: "" });
  const [editFiles, setEditFiles] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const providers = useMemo(
    () => [...new Set(ocModels.map(m => m.provider ?? "").filter(Boolean))],
    [ocModels]
  );
  const modelsForProvider = useCallback(
    (provider: string) => ocModels.filter(m => m.provider === provider),
    [ocModels]
  );

  async function loadOcAgents() {
    setOcLoading(true);
    try {
      const res = await apiClient.openclaw.agents.list();
      if (res.status === 200) setOcAgents(res.body);
    } finally {
      setOcLoading(false);
    }
  }

  useEffect(() => {
    void loadOcAgents();
    void apiClient.openclaw.models().then(res => {
      if (res.status === 200 && res.body.length > 0) {
        setOcModels(res.body);
        const firstProvider = res.body[0].provider ?? "";
        setNewProvider(prev => prev || firstProvider);
        setNewModel(prev => prev || res.body[0].id);
      }
    });
  }, []);

  function handleNewProviderChange(p: string) {
    setNewProvider(p);
    setNewModel(modelsForProvider(p)[0]?.id ?? "");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiClient.openclaw.agents.create({
        body: { id: newId.trim(), ...(newModel.trim() ? { model: newModel.trim() } : {}) },
      });
      if (res.status === 201) {
        setNewId("");
        const fp = ocModels[0]?.provider ?? "";
        setNewProvider(fp);
        setNewModel(ocModels.find(m => m.provider === fp)?.id ?? "");
        await loadOcAgents();
      } else {
        setError((res.body as { error: string }).error ?? "Failed to create");
      }
    } finally {
      setCreating(false);
    }
  }

  async function openEdit(agent: OcAgent) {
    setEditingAgent(agent);
    const agentProvider = agent.model
      ? (ocModels.find(m => m.id === agent.model)?.provider ?? ocModels[0]?.provider ?? "")
      : (ocModels[0]?.provider ?? "");
    setEditFields({
      name: agent.name ?? "",
      emoji: agent.emoji ?? "",
      model: agent.model ?? modelsForProvider(agentProvider)[0]?.id ?? "",
      provider: agentProvider,
    });
    setEditFiles({});
    setFileNames([]);
    setModalError(null);
    setFilesLoading(true);
    try {
      const res = await apiClient.openclaw.agents.files({ params: { id: agent.id } });
      if (res.status === 200) {
        const names = res.body.map(f => f.name);
        const contents: Record<string, string> = {};
        res.body.forEach(f => { contents[f.name] = f.content; });
        setFileNames(names);
        setEditFiles(contents);
        setActiveTab(names[0] ?? "");
      }
    } finally {
      setFilesLoading(false);
    }
  }

  function closeEdit() {
    setEditingAgent(null);
    setModalError(null);
  }

  async function handleSave() {
    if (!editingAgent) return;
    setSaving(true);
    setModalError(null);
    try {
      const res = await apiClient.openclaw.agents.update({
        params: { id: editingAgent.id },
        body: {
          name: editFields.name,
          emoji: editFields.emoji,
          model: editFields.model || undefined,
          files: editFiles,
        },
      });
      if (res.status === 200) {
        toast("Agent saved", "success");
        closeEdit();
        await loadOcAgents();
      } else {
        setModalError((res.body as { message: string }).message ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete agent "${id}"?`)) return;
    setError(null);
    try {
      const res = await apiClient.openclaw.agents.delete({ params: { id } });
      if (res.status === 200) {
        await loadOcAgents();
      } else {
        setError((res.body as { error: string }).error ?? "Failed to delete");
      }
    } catch {
      setError("Request failed");
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className={`${MONO} text-xl font-bold text-slate-100 tracking-widest uppercase`}>
          Agents
        </h1>
        <p className={`${LABEL} mt-1`}>OpenClaw gateway agent personas</p>
      </div>

      {/* ── OpenClaw Agents ── */}
      <div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="mb-6 flex gap-2 flex-wrap">
          <input
            className="glass rounded-lg px-3 py-2 text-sm text-slate-100 bg-transparent
              border border-slate-700 focus:outline-none focus:border-[#00d4ff] w-40"
            placeholder="Agent ID"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            required
          />
          <select
            className="glass rounded-lg px-3 py-2 text-sm text-slate-100
              bg-[rgba(15,23,42,0.8)] border border-slate-700
              focus:outline-none focus:border-[#00d4ff] w-36"
            value={newProvider}
            onChange={e => handleNewProviderChange(e.target.value)}
            required
            disabled={providers.length === 0}
          >
            {providers.length === 0
              ? <option value="">No providers</option>
              : providers.map(p => <option key={p} value={p}>{p}</option>)
            }
          </select>
          <select
            className="glass rounded-lg px-3 py-2 text-sm text-slate-100
              bg-[rgba(15,23,42,0.8)] border border-slate-700
              focus:outline-none focus:border-[#00d4ff] w-48"
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            required
            disabled={modelsForProvider(newProvider).length === 0}
          >
            {modelsForProvider(newProvider).length === 0
              ? <option value="">—</option>
              : modelsForProvider(newProvider).map(m => <option key={m.id} value={m.id}>{m.name}</option>)
            }
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg px-4 py-2 text-sm font-semibold bg-[#00d4ff]/10
              border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/20
              disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating…" : "+ New Agent"}
          </button>
        </form>

        {ocLoading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : ocAgents.length === 0 ? (
          <p className="text-slate-500 text-sm">No openclaw agents found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ocAgents.map(agent => (
              <div key={agent.id} className={`${GLASS} flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {agent.emoji && <span className="text-lg">{agent.emoji}</span>}
                      <span className={`${MONO} text-sm font-semibold text-slate-100`}>
                        {agent.name ?? agent.id}
                      </span>
                      {agent.isDefault && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold
                          bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff]">
                          default
                        </span>
                      )}
                    </div>
                    <p className={`${MONO} text-[11px] text-slate-500 mt-0.5`}>{agent.id}</p>
                  </div>
                </div>

                {(agent.routes?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(agent.routes ?? []).map(r => (
                      <span key={r} className="rounded px-1.5 py-0.5 text-[10px]
                        bg-slate-800 text-slate-400 border border-slate-700">
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => void openEdit(agent)}
                    className="flex-1 rounded px-3 py-1 text-xs font-semibold
                      bg-slate-800 border border-slate-700 text-slate-400
                      hover:text-slate-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(agent.id)}
                    disabled={agent.isDefault}
                    className="flex-1 rounded px-3 py-1 text-xs font-semibold
                      bg-red-900/20 border border-red-800/40 text-red-400
                      hover:bg-red-900/40 disabled:opacity-30 disabled:cursor-not-allowed
                      transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Agent Modal ── */}
      {editingAgent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative glass rounded-2xl w-full max-w-2xl mx-4 flex flex-col"
               style={{ height: "min(85vh, 720px)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {editingAgent.emoji && <span className="mr-2">{editingAgent.emoji}</span>}
                  {editingAgent.name ?? editingAgent.id}
                </h2>
                <p className={`${MONO} text-xs text-slate-500 mt-0.5`}>{editingAgent.id}</p>
              </div>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Identity fields */}
            <div className="px-6 pb-4 shrink-0 space-y-3">
              {modalError && (
                <div className="rounded-lg bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
                  {modalError}
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className={LABEL}>Display name</label>
                  <input
                    className={INPUT}
                    placeholder="Display name"
                    value={editFields.name}
                    onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <label className={LABEL}>Emoji</label>
                  <input
                    className={INPUT}
                    placeholder="🤖"
                    value={editFields.emoji}
                    onChange={e => setEditFields(f => ({ ...f, emoji: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-32 space-y-1">
                  <label className={LABEL}>Provider</label>
                  <select
                    className={INPUT + " bg-[rgba(15,23,42,0.8)]"}
                    value={editFields.provider}
                    onChange={e => {
                      const p = e.target.value;
                      setEditFields(f => ({ ...f, provider: p, model: modelsForProvider(p)[0]?.id ?? "" }));
                    }}
                  >
                    {providers.length === 0
                      ? <option value={editFields.provider}>{editFields.provider || "—"}</option>
                      : providers.map(p => <option key={p} value={p}>{p}</option>)
                    }
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className={LABEL}>Model</label>
                  <select
                    className={INPUT + " bg-[rgba(15,23,42,0.8)]"}
                    value={editFields.model}
                    onChange={e => setEditFields(f => ({ ...f, model: e.target.value }))}
                  >
                    {(modelsForProvider(editFields.provider).length > 0
                      ? modelsForProvider(editFields.provider)
                      : ocModels.filter(m => m.id === editFields.model)
                    ).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    {modelsForProvider(editFields.provider).length === 0 && !editFields.model &&
                      <option value="">—</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            {!filesLoading && fileNames.length > 0 && (
              <div className="px-6 shrink-0 flex gap-1 border-b border-slate-800 overflow-x-auto">
                {fileNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setActiveTab(name)}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === name
                        ? "border-[#00d4ff] text-[#00d4ff]"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content — only the textarea scrolls */}
            <div className="flex-1 min-h-0 px-6 py-4">
              {filesLoading ? (
                <p className="text-xs text-slate-500 text-center pt-8">Loading files…</p>
              ) : fileNames.length === 0 ? (
                <p className="text-xs text-slate-600 text-center pt-8">No workspace files found.</p>
              ) : (
                <textarea
                  key={activeTab}
                  className="w-full h-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]
                    rounded-lg px-3 py-2 text-xs text-slate-300 font-mono resize-none
                    focus:outline-none focus:border-[rgba(0,212,255,0.4)] overflow-y-auto"
                  value={editFiles[activeTab] ?? ""}
                  onChange={e => setEditFiles(f => ({ ...f, [activeTab]: e.target.value }))}
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 shrink-0 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || filesLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(0,212,255,0.12)] text-[#00d4ff]
                  border border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.2)] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
