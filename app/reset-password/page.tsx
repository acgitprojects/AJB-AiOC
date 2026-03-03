"use client";

/**
 * app/reset-password/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Set a new password using a token from the reset email.
 * URL: /reset-password?token=<hex>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";

function ResetForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token. Request a new link.");
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json() as { ok: boolean; error?: string };

      if (data.ok) {
        setDone(true);
        setTimeout(() => router.replace("/login"), 3000);
      } else {
        const msg =
          data.error === "invalid_or_expired_token" ? "This reset link has expired or is invalid. Please request a new one." :
          data.error === "password_too_short"        ? "Password must be at least 8 characters." :
          "Something went wrong. Please try again.";
        setError(msg);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#00d4ff 1px,transparent 1px),linear-gradient(90deg,#00d4ff 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-arc-cyan/10 border border-arc-cyan/30 shadow-[0_0_24px_rgba(0,212,255,0.2)] mb-4">
            <KeyRound size={24} className="text-arc-cyan" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Set New Password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong new password</p>
        </div>

        {done ? (
          <div className="glass rounded-2xl p-6 shadow-card border border-navy-700/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle size={22} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Password updated!</p>
              <p className="text-sm text-slate-400">Redirecting to login in a moment…</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="glass rounded-2xl p-6 shadow-card border border-navy-700/60 space-y-4"
          >
            {/* New password */}
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-widest block mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="w-full text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-2.5 pr-10
                    text-slate-200 placeholder-slate-600
                    focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)]
                    transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-arc-cyan transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-widest block mb-1.5">
                Confirm password
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="w-full text-sm bg-navy-900/70 border border-navy-700 rounded-xl px-4 py-2.5
                  text-slate-200 placeholder-slate-600
                  focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)]
                  transition-all"
              />
            </div>

            {/* Password strength hint */}
            {password.length > 0 && (
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= (i + 1) * 3
                        ? password.length >= 12 ? "bg-green-500"
                          : password.length >= 8 ? "bg-yellow-500" : "bg-red-500"
                        : "bg-navy-700"
                    }`}
                  />
                ))}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm || !token}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all
                bg-arc-cyan/20 text-arc-cyan border border-arc-cyan/50 hover:bg-arc-cyan/30 hover:shadow-glow-cyan
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin" /> Updating…</>
                : <><KeyRound size={15} /> Set new password</>
              }
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft size={12} /> Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
