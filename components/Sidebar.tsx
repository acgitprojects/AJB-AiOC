"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Plug,
  ChevronLeft,
  Menu,
  X,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/integrations", label: "Integrations", icon: Plug },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavItems = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-indigo-400" />
          <span className="text-white font-bold text-sm tracking-wide">AJB Ops Centre</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-40 flex flex-col w-64 bg-slate-900 pt-16 px-4 pb-6 gap-1">
            <NavItems />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-slate-900 h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-700 mb-2">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-indigo-400 shrink-0" />
              <span className="text-white font-bold text-sm tracking-wide leading-tight">
                AJB Ops Centre
              </span>
            </div>
          )}
          {collapsed && <Zap size={20} className="text-indigo-400 mx-auto" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white ml-auto"
          >
            <ChevronLeft
              size={16}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-2 flex-1">
          <NavItems />
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-bold shrink-0">
              AC
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs text-white font-medium truncate">Andrew Cheung</p>
                <p className="text-xs text-slate-400 truncate">CEO</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
