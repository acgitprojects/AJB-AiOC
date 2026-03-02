"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Plug,
  Menu,
  X,
  Settings,
  CalendarDays,
  Columns2,
  Network,
  Workflow,
  Newspaper,
} from "lucide-react";

const nav = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard },
  { href: "/agent",        label: "Agent",          icon: Bot },
  { href: "/briefing",     label: "Briefing",       icon: Newspaper },
  { href: "/calendar",     label: "Calendar",       icon: CalendarDays },
  { href: "/board",        label: "Board",          icon: Columns2 },
  { href: "/org",          label: "Org Chart",      icon: Network },
  { href: "/pipeline",     label: "Pipeline",       icon: Workflow },
  { href: "/library",      label: "Library",        icon: BookOpen },
  { href: "/integrations", label: "Integrations",   icon: Plug },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gwOnline, setGwOnline] = useState<boolean | null>(null);

  // Ping gateway status for the status dot
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/openclaw/status", { cache: "no-store" });
        const d = await res.json();
        setGwOnline(!!d.connected);
      } catch { setGwOnline(false); }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const NavLink = ({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: React.ElementType; onClick?: () => void }) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`group/item relative flex items-center gap-3 px-3 py-2.5 rounded-lg
          transition-all duration-200 text-sm font-medium select-none
          ${ active
            ? "text-[#00d4ff] bg-[rgba(0,212,255,0.08)] shadow-[inset_2px_0_0_#00d4ff]"
            : "text-slate-400 hover:text-slate-100 hover:bg-[rgba(255,255,255,0.04)]"
          }`}
      >
        <Icon size={18} className="shrink-0" />
        <span className="opacity-0 group-hover:opacity-100 lg:opacity-100 whitespace-nowrap
          transition-opacity duration-200 delay-75 overflow-hidden">{label}</span>
        {active && (
          <span className="absolute right-2 w-1 h-1 rounded-full bg-[#00d4ff] shadow-[0_0_6px_rgba(0,212,255,0.8)]" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14
        bg-[#040d18]/90 backdrop-blur border-b border-[rgba(0,212,255,0.10)]">
        <div className="flex items-center gap-2">
          <HexLogo />
          <span className="text-[#00d4ff] font-bold tracking-widest text-sm font-mono-jet">AiOC</span>
        </div>
        <button onClick={() => setMobileOpen(o => !o)}
          className="text-slate-400 hover:text-[#00d4ff] transition-colors">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 bottom-0 w-60 bg-[#040d18] border-r border-[rgba(0,212,255,0.10)]
            flex flex-col p-3 gap-1 animate-fade-in" onClick={e => e.stopPropagation()}>
            {nav.map(n => (
              <NavLink key={n.href} {...n} onClick={() => setMobileOpen(false)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Desktop sidebar (group for hover expand) ───────────── */}
      <aside className="group hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-30
        w-16 hover:w-56 transition-all duration-300 ease-in-out overflow-hidden
        bg-[#040d18]/95 backdrop-blur
        border-r border-[rgba(0,212,255,0.10)]">

        {/* Logo */}
        <div className="flex items-center gap-3 px-3.5 py-5 shrink-0">
          <HexLogo />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100
            text-[#00d4ff] font-bold tracking-widest text-sm font-mono-jet whitespace-nowrap">AiOC</span>
        </div>

        {/* Divider */}
        <div className="mx-3 mb-4 h-px bg-gradient-to-r from-[rgba(0,212,255,0.3)] to-transparent" />

        {/* Nav */}
        <nav className="flex-1 px-2 flex flex-col gap-0.5">
          {nav.map(n => <NavLink key={n.href} {...n} />)}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-4 flex flex-col gap-0.5">
          {/* OpenClaw status */}
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="shrink-0 relative">
              <span className={`w-2 h-2 rounded-full block ${
                gwOnline === null ? "bg-slate-600" :
                gwOnline ? "dot-online" : "dot-idle"
              }`} />
              {gwOnline && (
                <span className="absolute inset-0 rounded-full bg-[#10d6a0] animate-ping opacity-50" />
              )}
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75
              text-xs text-slate-500 whitespace-nowrap">
              {gwOnline === null ? "Checking…" : gwOnline ? "Gateway online" : "Gateway offline"}
            </span>
          </div>
          <NavDivider />
          <Link href="/integrations"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500
              hover:text-slate-300 hover:bg-[rgba(255,255,255,0.04)] transition-all text-sm">
            <Settings size={16} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75
              whitespace-nowrap">Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

function HexLogo() {
  return (
    <div className="w-8 h-8 shrink-0 hex-clip bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6]
      flex items-center justify-center">
      <span className="text-[#040d18] font-bold text-xs font-mono-jet">AI</span>
    </div>
  );
}

function NavDivider() {
  return <div className="my-1 mx-3 h-px bg-[rgba(255,255,255,0.05)]" />;
}

