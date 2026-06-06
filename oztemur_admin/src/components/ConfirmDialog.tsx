"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   ConfirmDialog — Premium modal confirmation
   Backdrop blur, scale animation, semantic variants
   ═══════════════════════════════════════════════ */

type DialogVariant = "danger" | "warning" | "info";

interface DialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  icon?: string;
}

interface DialogContextValue {
  confirm: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue>({ confirm: () => Promise.resolve(false) });
export const useConfirm = () => useContext(DialogContext);

const VARIANT_CONFIG: Record<DialogVariant, { iconBg: string; iconColor: string; confirmBg: string; confirmHover: string }> = {
  danger:  { iconBg: "rgba(179,38,30,0.08)",  iconColor: "var(--error)",   confirmBg: "var(--error)",   confirmHover: "#a12b23" },
  warning: { iconBg: "rgba(245,158,11,0.1)",   iconColor: "#d97706",       confirmBg: "#d97706",        confirmHover: "#b45309" },
  info:    { iconBg: "rgba(0,6,102,0.06)",      iconColor: "var(--primary)", confirmBg: "var(--primary)", confirmHover: "#000444" },
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<(DialogOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ ...options, resolve });
      setLeaving(false);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setLeaving(true);
    setTimeout(() => {
      dialog?.resolve(result);
      setDialog(null);
      setLeaving(false);
    }, 200);
  }, [dialog]);

  // Keyboard: Escape to cancel
  useEffect(() => {
    if (!dialog) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog, close]);

  const cfg = dialog ? VARIANT_CONFIG[dialog.variant || "danger"] : VARIANT_CONFIG.danger;
  const icon = dialog?.icon || (dialog?.variant === "warning" ? "warning" : dialog?.variant === "info" ? "info" : "delete_forever");

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}

      {dialog && (
        // Backdrop
        <div
          onClick={() => close(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
            animation: leaving ? "dialogFadeOut 0.2s ease forwards" : "dialogFadeIn 0.2s ease forwards",
          }}
        >
          {/* Dialog */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420,
              background: "var(--surface-lowest)",
              borderRadius: 16,
              boxShadow: "0 20px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(198,197,212,0.08)",
              overflow: "hidden",
              animation: leaving ? "dialogScaleOut 0.2s ease forwards" : "dialogScaleIn 0.25s cubic-bezier(0,0,0.2,1) forwards",
            }}
          >
            {/* Content */}
            <div style={{ padding: "28px 28px 0" }}>
              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: cfg.iconBg, margin: "0 auto 20px",
              }}>
                <Icon name={icon} style={{ fontSize: 28, color: cfg.iconColor }} />
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: "'Manrope',sans-serif", fontSize: 18, fontWeight: 800,
                color: "var(--on-surface)", textAlign: "center", margin: 0,
                letterSpacing: "-0.01em",
              }}>
                {dialog.title}
              </h2>

              {/* Description */}
              {dialog.description && (
                <p style={{
                  fontSize: 13, lineHeight: 1.6, color: "var(--on-surface-variant)",
                  textAlign: "center", marginTop: 10, marginBottom: 0,
                }}>
                  {dialog.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{
              display: "flex", gap: 10, padding: "24px 28px 28px",
              marginTop: 4,
            }}>
              <button
                onClick={() => close(false)}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  color: "var(--on-surface-variant)", background: "var(--surface)",
                  border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer",
                  transition: "background .15s, border-color .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-low)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; }}
              >
                {dialog.cancelLabel || t("Cancel", "Vazgeç")}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  color: "#fff", background: cfg.confirmBg,
                  border: "none", cursor: "pointer",
                  boxShadow: `0 4px 14px ${cfg.iconBg}`,
                  transition: "background .15s, box-shadow .15s, transform .1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = cfg.confirmHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = cfg.confirmBg; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {dialog.confirmLabel || t("Confirm", "Onayla")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes dialogFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dialogFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes dialogScaleIn { from { opacity: 0; transform: scale(0.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dialogScaleOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(4px); } }
      `}</style>
    </DialogContext.Provider>
  );
}
