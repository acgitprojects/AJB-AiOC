"use client";

/**
 * app/login/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Password gate for the OpenClaw Operations Centre.
 * Submits to POST /api/auth/login, then redirects to /dashboard (or ?from=…).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("from") ?? "/dashboard";

  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean; error?: string };

      if (data.ok) {
        router.replace(redirectTo);
      } else {
        setError("Incorrect password.");
        setLoading(false);
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      {/* Subtle grid bg */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#00d4ff 1px,transparent 1px),linear-gradient(90deg,#00d4ff 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-arc-cyan/10 border border-arc-cyan/30 shadow-[0_0_24px_rgba(0,212,255,0.2)] mb-4">
            <Lock size={24} className="text-arc-cyan" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            OpenClaw <span className="text-arc-cyan">Ops Centre</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Enter your access password to continue</p>
        </div>

        {/* Card */}
        <form
          onSubmit={submit}
          className="glass rounded-2xl p-6 shadow-card border border-navy-700/60 space-y-4"
        >
          <div>
            <label className="text-xs text-slate-500 font-medium uppercase tracking-widest block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
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

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200
              bg-arc-cyan/20 text-arc-cyan border border-arc-cyan/50 hover:bg-arc-cyan/30 hover:shadow-glow-cyan
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-arc-cyan/40 border-t-arc-cyan rounded-full animate-spin" /> Authenticating…</>
              : <><LogIn size={16} /> Sign in</>
            }
          </button>
        </form>

        <p className="text-center text-xs text-slate-700 mt-6">
          OpenClaw Operations Centre · Internal access only
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
