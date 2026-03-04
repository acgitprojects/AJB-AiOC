"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-l-4 border-emerald-400 text-emerald-300",
  error:   "border-l-4 border-red-400     text-red-300",
  info:    "border-l-4 border-[#00d4ff]   text-slate-200",
};

function ToastContainer({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {items.map(item => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl
            bg-[#0a1628] border border-[rgba(255,255,255,0.08)] min-w-[220px] max-w-sm
            animate-fade-in ${TYPE_STYLES[item.type]}`}
        >
          <span className="text-sm flex-1">{item.message}</span>
          <button
            onClick={() => onDismiss(item.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setItems(prev => [...prev, { id, message, type }]);
    const t = setTimeout(() => dismiss(id), 3500);
    timers.current.set(id, t);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
