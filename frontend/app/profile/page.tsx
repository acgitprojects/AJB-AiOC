"use client";

/**
 * app/profile/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User profile — change password, alert preferences, logout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, KeyRound, Bell, BellOff, LogOut, Save,
  Eye, EyeOff, Check, AlertTriangle, Mail
} from "lucide-react";

interface Me {
  id?: string;
  email: string;
  name: string;
  role: "admin" | "user";
  alertsEnabled: boolean;
  alertEmail?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe]           = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password state
  const [curPw, setCurPw]   = useState("");
  const [newPw, setNewPw]   = useState("");
  const [confPw, setConfPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // Alert prefs state
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail]       = useState("");
  const [prefSaving, setPrefSaving]       = useState(false);
  const [prefMsg, setPrefMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  // Load current user
  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then((d: { ok: boolean; user?: Me }) => {
        if (d.ok && d.user) {
          setMe(d.user);
          setAlertsEnabled(d.user.alertsEnabled);
          setAlertEmail(d.user.alertEmail ?? d.user.email);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // Change password
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwSaving) return;
    setPwMsg(null);

    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    if (newPw !== confPw) {
      setPwMsg({ ok: false, text: "Passwords do not match." });
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setPwMsg({ ok: true, text: "Password updated successfully." });
        setCurPw(""); setNewPw(""); setConfPw("");
      } else {
        const msg =
          data.error === "wrong_current_password" ? "Current password is incorrect." :
          data.error === "password_too_short"      ? "Password must be at least 8 characters." :
          "Failed to update password.";
        setPwMsg({ ok: false, text: msg });
      }
    } catch {
      setPwMsg({ ok: false, text: "Network error." });
    }
    setPwSaving(false);
  };

  // Save alert preferences
  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.id || prefSaving) return;
    setPrefMsg(null);
    setPrefSaving(true);
    try {
      const res = await fetch(`/api/users/${me.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ alertsEnabled, alertEmail: alertEmail.trim() || undefined }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) setPrefMsg({ ok: true, text: "Preferences saved." });
      else setPrefMsg({ ok: false, text: "Failed to save." });
    } catch {
      setPrefMsg({ ok: false, text: "Network error." });
    }
    setPrefSaving(false);
  };

  // Logout
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "DELETE" }).catch(() => null);
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <span className="w-5 h-5 border-2 border-slate-600 border-t-arc-cyan rounded-full animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User size={22} className="text-arc-cyan" /> My Profile
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {me?.email} ·{" "}
            <span className={me?.role === "admin" ? "text-purple-400" : "text-slate-400"}>
              {me?.role}
            </span>
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>

      {/* ── Change Password ─────────────────────────────────────── */}
      <section className="glass rounded-2xl border border-navy-700/60 shadow-card p-5">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-arc-cyan" /> Change Password
        </h2>

        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="field-label">Current password</label>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"}
                value={curPw}
                onChange={e => setCurPw(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className="field-input pr-10"
                required
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-arc-cyan transition-colors" tabIndex={-1}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">New password</label>
              <input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="field-input mt-1"
                required
              />
            </div>
            <div>
              <label className="field-label">Confirm new password</label>
              <input
                type={showPw ? "text" : "password"}
                value={confPw}
                onChange={e => setConfPw(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="field-input mt-1"
                required
              />
            </div>
          </div>

          {pwMsg && (
            <p className={`text-xs flex items-center gap-2 px-3 py-2 rounded-lg ${
              pwMsg.ok
                ? "text-green-400 bg-green-500/10 border border-green-500/20"
                : "text-red-400 bg-red-500/10 border border-red-500/20"
            }`}>
              {pwMsg.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
              {pwMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pwSaving || !curPw || !newPw || !confPw}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-40"
          >
            {pwSaving
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
              : <><Save size={14} /> Update password</>
            }
          </button>
        </form>
      </section>

      {/* ── Alert Preferences ───────────────────────────────────── */}
      <section className="glass rounded-2xl border border-navy-700/60 shadow-card p-5">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-1">
          <Bell size={16} className="text-arc-cyan" /> Alert Notifications
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Receive email notifications when admins send system alerts.
        </p>

        <form onSubmit={savePrefs} className="space-y-4">
          {/* Toggle */}
          <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-navy-700/60 bg-navy-900/40 cursor-pointer">
            <div className="flex items-center gap-2.5">
              {alertsEnabled ? <Bell size={16} className="text-green-400" /> : <BellOff size={16} className="text-slate-500" />}
              <div>
                <p className="text-sm text-slate-200 font-medium">Email alerts</p>
                <p className="text-xs text-slate-500">
                  {alertsEnabled ? "You will receive alert emails." : "You will not receive alerts."}
                </p>
              </div>
            </div>
            <div
              onClick={() => setAlertsEnabled(v => !v)}
              className={`w-10 h-5.5 relative rounded-full transition-colors cursor-pointer ${
                alertsEnabled ? "bg-green-500" : "bg-navy-700"
              }`}
              style={{ height: "22px" }}
            >
              <span
                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                  alertsEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
                style={{ width: "18px", height: "18px", transform: alertsEnabled ? "translateX(20px)" : "translateX(2px)" }}
              />
            </div>
          </label>

          {alertsEnabled && (
            <div>
              <label className="field-label flex items-center gap-1.5">
                <Mail size={12} /> Alert email (optional override)
              </label>
              <input
                type="email"
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
                placeholder={me?.email}
                className="field-input mt-1"
              />
              <p className="text-xs text-slate-600 mt-1">Leave blank to use your account email.</p>
            </div>
          )}

          {prefMsg && (
            <p className={`text-xs flex items-center gap-2 px-3 py-2 rounded-lg ${
              prefMsg.ok
                ? "text-green-400 bg-green-500/10 border border-green-500/20"
                : "text-red-400 bg-red-500/10 border border-red-500/20"
            }`}>
              {prefMsg.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
              {prefMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={prefSaving || !me?.id}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-40"
          >
            {prefSaving
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Save size={14} /> Save preferences</>
            }
          </button>
        </form>
      </section>
    </div>
  );
}
