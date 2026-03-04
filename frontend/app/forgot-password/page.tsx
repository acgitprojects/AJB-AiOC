"use client";

/**
 * app/forgot-password/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Request a password reset email.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Always show success to prevent enumeration
      setSent(true);
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-arc-cyan/10 border border-arc-cyan/30 shadow-[0_0_24px_rgba(0,212,255,0.2)] mb-4">
            <Mail size={24} className="text-arc-cyan" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your email to receive a reset link
          </p>
        </div>

        {sent ? (
          <div className="glass rounded-2xl p-6 shadow-card border border-navy-700/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <Send size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Check your inbox</p>
              <p className="text-sm text-slate-400">
                If an account exists for <span className="text-slate-200">{email}</span>, a reset link has been sent.
                The link expires in 60 minutes.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-arc-cyan hover:text-arc-cyan/80 transition-colors"
            >
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="glass rounded-2xl p-6 shadow-card border border-navy-700/60 space-y-4"
          >
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-widest block mb-1.5">
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Mail size={15} />
                </span>
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full text-sm bg-navy-900/70 border border-navy-700 rounded-xl pl-9 pr-4 py-2.5
                    text-slate-200 placeholder-slate-600
                    focus:outline-none focus:border-arc-cyan/60 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)]
                    transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all
                bg-arc-cyan/20 text-arc-cyan border border-arc-cyan/50 hover:bg-arc-cyan/30 hover:shadow-glow-cyan
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin" /> Sending…</>
                : <><Send size={15} /> Send reset link</>
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
