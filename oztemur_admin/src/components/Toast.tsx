"use client";
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   Öztemur Admin · Premium Toast System
   Slide-in toasts with auto-dismiss progress bar
   ═══════════════════════════════════════════════ */

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; bg: string; accent: string; text: string; progress: string }> = {
  success: { icon: "check_circle",  bg: "#f0fdf4", accent: "#15803d", text: "#14532d", progress: "#22c55e" },
  error:   { icon: "error",         bg: "#fef2f2", accent: "#b91c1c", text: "#7f1d1d", progress: "#ef4444" },
  warning: { icon: "warning",       bg: "#fffbeb", accent: "#a16207", text: "#78350f", progress: "#f59e0b" },
  info:    { icon: "info",          bg: "#eff6ff", accent: "#1d4ed8", text: "#1e3a5f", progress: "#3b82f6" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Start leave animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    // Remove after animation
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 340);
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "success", duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, variant, duration, leaving: false }]);

    const timer = setTimeout(() => removeToast(id), duration);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    removeToast(id);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 10, pointerEvents: "none" }}>
        {toasts.map((t, i) => {
          const cfg = VARIANT_CONFIG[t.variant];
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                display: "flex", alignItems: "flex-start", gap: 12,
                minWidth: 360, maxWidth: 440,
                padding: "16px 18px 16px 16px",
                borderRadius: 12,
                background: cfg.bg,
                boxShadow: "0 8px 30px -6px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)",
                borderLeft: `4px solid ${cfg.accent}`,
                position: "relative",
                overflow: "hidden",
                // Delay folded into the shorthand — mixing `animation` with a
                // separate `animationDelay` longhand triggers a React warning.
                animation: t.leaving
                  ? "toastSlideOut 0.32s cubic-bezier(0.4, 0, 1, 1) 0ms forwards"
                  : `toastSlideIn 0.36s cubic-bezier(0, 0, 0.2, 1) ${i * 40}ms forwards`,
                opacity: 0,
                transform: "translateX(40px)",
              }}
            >
              {/* Icon */}
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${cfg.accent}14`, flexShrink: 0 }}>
                <Icon name={cfg.icon} style={{ fontSize: 20, color: cfg.accent }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: cfg.text, lineHeight: 1.4 }}>{t.message}</p>
                <p style={{ fontSize: 11, color: `${cfg.text}99`, marginTop: 3, fontWeight: 500 }}>
                  {t.variant === "success" ? "Operation completed" : t.variant === "error" ? "Please try again" : t.variant === "warning" ? "Attention needed" : "Information"}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => dismiss(t.id)}
                style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: `${cfg.text}80`, display: "flex", flexShrink: 0, borderRadius: 6, transition: "background .15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = `${cfg.accent}10`)}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <Icon name="close" style={{ fontSize: 16 }} />
              </button>

              {/* Progress bar */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `${cfg.accent}15` }}>
                <div style={{
                  height: "100%", background: cfg.progress, borderRadius: "0 3px 3px 0",
                  animation: t.leaving ? "none" : `toastProgress ${t.duration}ms linear forwards`,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastSlideOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(60px) scale(0.94); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
