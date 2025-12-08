// src/components/ui/ToastProvider.tsx
"use client";
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

type ToastType = "success" | "info" | "error";
type ToastItem = { id: string; type: ToastType; title?: string; message?: string; duration?: number };

const ToastContext = createContext<{
  push: (t: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const toast: ToastItem = { id, ...t };
    setToasts((s) => [...s, toast]);
    // auto dismiss
    const dur = t.duration ?? 1500;
    if (dur > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter(x => x.id !== id));
      }, dur + 200); // small buffer
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter(x => x.id !== id));
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center px-4 py-6">
        <div className="w-full max-w-md flex flex-col items-center space-y-2">
          {toasts.map(t => <Toast key={t.id} item={t} onClose={() => dismiss(t.id)} />)}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

/* ---------------------------
   Individual Toast component
   --------------------------- */
const Toast: React.FC<{ item: ToastItem; onClose: () => void }> = ({ item, onClose }) => {
  // small tick animation for success
  return (
    <div
      role="status"
      className={`pointer-events-auto w-full bg-white border shadow-md rounded-lg p-3 transform transition-all duration-300 ease-in-out animate-slide-up`}
      onClick={onClose}
      style={{ cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-start gap-3">
        <div style={{ minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {item.type === "success" && <TickIcon />}
          {item.type === "info" && <InfoIcon />}
          {item.type === "error" && <ErrorIcon />}
        </div>

        <div className="flex-1">
          {item.title && <div className="font-semibold text-sm">{item.title}</div>}
          {item.message && <div className="text-xs text-gray-600 mt-0.5">{item.message}</div>}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 260ms ease; }
      `}</style>
    </div>
  );
};

/* ---------- Icons ---------- */
const TickIcon = () => (
  <div style={{ width: 34, height: 34, borderRadius: 999, background: "linear-gradient(135deg,#16a34a,#059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const InfoIcon = () => (
  <div style={{ width: 34, height: 34, borderRadius: 999, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.2)" />
    </svg>
  </div>
);

const ErrorIcon = () => (
  <div style={{ width: 34, height: 34, borderRadius: 999, background: "linear-gradient(135deg,#dc2626,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);
