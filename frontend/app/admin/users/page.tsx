"use client";

/**
 * app/admin/users/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User management dashboard (admin only).
 * List users, create new users, toggle roles, delete.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Trash2, ShieldCheck, Shield,
  Bell, BellOff, RefreshCw, Mail, Eye, EyeOff, X, Check,
  AlertTriangle
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  alertsEnabled: boolean;
  alertEmail?: string;
  createdAt: string;
}

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  alertsEnabled: boolean;
}

const EMPTY_FORM: CreateForm = {
  name: "", email: "", password: "", role: "user", alertsEnabled: false,
};

// ─── Alert sender modal ───────────────────────────────────────────────────────

function SendAlertModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<{ sent: number; failed: number } | null>(null);

  const send = async () => {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users/alerts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subject, message, severity }),
      });
      const data = await res.json() as { ok: boolean; sent: number; failed: number };
      if (data.ok) setResult({ sent: data.sent, failed: data.failed });
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass rounded-2xl border border-navy-700/60 shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2"><Bell size={16} className="text-arc-cyan" /> Send Alert</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        {result ? (
          <div className="text-center py-4 space-y-2">
            <Check size={28} className="text-green-400 mx-auto" />
            <p className="text-white font-semibold">Alert sent</p>
            <p className="text-sm text-slate-400">{result.sent} delivered · {result.failed} failed</p>
            <button onClick={onClose} className="mt-2 text-sm text-arc-cyan hover:text-arc-cyan/80 transition-colors">Close</button>
          </div>
        ) : (
          <>
            {/* Severity */}
            <div>
              <label className="field-label">Severity</label>
              <div className="flex gap-2 mt-1.5">
                {(["info", "warning", "critical"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all capitalize ${
                      severity === s
                        ? s === "critical" ? "bg-red-500/20 text-red-400 border-red-500/50"
                          : s === "warning" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                          : "bg-arc-cyan/20 text-arc-cyan border-arc-cyan/50"
                        : "bg-transparent text-slate-500 border-navy-700 hover:border-navy-500"
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>
            {/* Subject */}
            <div>
              <label className="field-label">Subject</label>
              <input
                className="field-input mt-1.5"
                placeholder="Alert subject…"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            {/* Message */}
            <div>
              <label className="field-label">Message</label>
              <textarea
                className="field-input mt-1.5 resize-none h-24"
                placeholder="Alert body…"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500">Sends to all users with email alerts enabled.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 btn-secondary text-sm py-2">Cancel</button>
              <button
                onClick={send}
                disabled={loading || !subject.trim() || !message.trim()}
                className="flex-1 btn-primary text-sm py-2 disabled:opacity-40"
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersAdminPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [form, setForm]         = useState<CreateForm>(EMPTY_FORM);
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json() as { ok: boolean; users?: User[]; error?: string };
      if (data.ok && data.users) setUsers(data.users);
      else setError(data.error === "forbidden" ? "Admin access required." : "Failed to load users.");
    } catch {
      setError("Network error.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormErr("");
    try {
      const res = await fetch("/api/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setForm(EMPTY_FORM);
        setShowForm(false);
        await loadUsers();
      } else {
        const msg =
          data.error === "email_taken"       ? "Email already in use." :
          data.error === "password_too_short" ? "Password must be at least 8 characters." :
          data.error === "missing_fields"     ? "All fields are required." :
          "Failed to create user.";
        setFormErr(msg);
      }
    } catch {
      setFormErr("Network error.");
    }
    setSaving(false);
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) await loadUsers();
      else alert(data.error === "cannot_delete_last_admin" ? "Cannot delete the last admin user." : "Delete failed.");
    } catch { /* ignore */ }
    setDeleteId(null);
  };

  const toggleAlerts = async (user: User) => {
    await fetch(`/api/users/${user.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ alertsEnabled: !user.alertsEnabled }),
    });
    await loadUsers();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-arc-cyan" /> User Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage access, roles, and alert subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlert(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Bell size={15} /> Send Alert
          </button>
          <button
            onClick={() => { setShowForm(true); setFormErr(""); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <UserPlus size={15} /> Add User
          </button>
        </div>
      </div>

      {/* Create user form */}
      {showForm && (
        <form
          onSubmit={createUser}
          className="glass rounded-2xl border border-navy-700/60 shadow-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <UserPlus size={16} className="text-arc-cyan" /> New User
            </h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Full name</label>
              <input
                className="field-input mt-1"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <div className="relative mt-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  className="field-input pl-8"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  className="field-input pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-arc-cyan transition-colors" tabIndex={-1}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="field-label">Role</label>
              <select
                className="field-input mt-1"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin" | "user" }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={form.alertsEnabled}
              onChange={e => setForm(f => ({ ...f, alertsEnabled: e.target.checked }))}
              className="w-4 h-4 accent-arc-cyan"
            />
            <span className="text-sm text-slate-400">Enable email alerts for this user</span>
          </label>

          {formErr && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={13} /> {formErr}
            </p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {saving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="glass rounded-2xl border border-navy-700/60 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-400 gap-2">
            <AlertTriangle size={18} /> {error}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Users size={32} className="opacity-30" />
            <p className="text-sm">No users yet. Add the first user above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/60">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Alerts</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-arc-cyan/10 border border-arc-cyan/20 flex items-center justify-center font-semibold text-xs text-arc-cyan uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-slate-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                          : "bg-slate-500/10 text-slate-400 border border-slate-600/30"
                      }`}>
                        {user.role === "admin" ? <ShieldCheck size={11} /> : <Shield size={11} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleAlerts(user)}
                        title={user.alertsEnabled ? "Disable alerts" : "Enable alerts"}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                          user.alertsEnabled
                            ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25"
                            : "bg-slate-500/10 text-slate-500 border-slate-600/30 hover:border-slate-500/50"
                        }`}
                      >
                        {user.alertsEnabled ? <Bell size={11} /> : <BellOff size={11} />}
                        {user.alertsEnabled ? "On" : "Off"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {deleteId === user.id ? (
                        <span className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-400">Delete?</span>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                          >Yes</button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >No</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteId(user.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAlert && <SendAlertModal onClose={() => setShowAlert(false)} />}
    </div>
  );
}
