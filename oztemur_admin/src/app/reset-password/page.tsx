"use client";

import { useEffect, useState, type FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authResetApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

// useSearchParams must run inside a Suspense boundary in Next.js 16.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const token = params.get("token") ?? "";

  type Phase = "validating" | "invalid" | "form" | "saving" | "done";
  const [phase, setPhase] = useState<Phase>("validating");
  const [invalidMsg, setInvalidMsg] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-validate the token on mount so we can show "expired" / "invalid"
  // before the admin types anything. Backend uses constant-time hash
  // comparison so this round-trip is safe.
  useEffect(() => {
    if (!token) { setPhase("invalid"); setInvalidMsg(t("Missing token.", "Bağlantı eksik.")); return; }
    authResetApi.validate(token).then(r => {
      if (r.success) setPhase("form");
      else { setPhase("invalid"); setInvalidMsg(r.message || t("Invalid link.", "Bağlantı geçersiz.")); }
    });
  }, [token, t]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("Password must be at least 8 characters.", "Şifre en az 8 karakter olmalı.")); return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match.", "Şifreler eşleşmiyor.")); return;
    }
    setPhase("saving");
    const r = await authResetApi.reset(token, password);
    if (r.success) {
      setPhase("done");
      // Drop them at the login page after they've had a moment to read the
      // confirmation message.
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setError(r.message || t("Reset failed.", "Sıfırlama başarısız."));
      setPhase("form");
    }
  };

  const input: React.CSSProperties = { width: "100%", padding: "14px 16px 14px 44px", borderRadius: 6, fontSize: 14, background: "var(--surface-low)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--surface)", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-30%", right: "-15%", width: "60%", height: "100%", borderRadius: "50%", background: "var(--primary)", opacity: 0.03 }} />
      <div style={{ position: "absolute", bottom: "-25%", left: "-10%", width: "50%", height: "80%", borderRadius: "50%", background: "var(--primary)", opacity: 0.02 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, textAlign: "center" }}>
        <Image src="/logo-seffaf.png" alt="Öztemur Group" width={200} height={56} priority style={{ objectFit: "contain", height: "auto", margin: "0 auto" }} />
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "8px 0 36px" }}>{t("Set a new password", "Yeni şifre belirleyin")}</p>

        <div style={{ background: "var(--surface-lowest)", borderRadius: 8, padding: "40px 36px", boxShadow: "var(--shadow-ambient)", textAlign: "left" }}>
          {phase === "validating" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite", display: "inline-block" }} />
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>{t("Validating link…", "Bağlantı doğrulanıyor…")}</p>
            </div>
          )}

          {phase === "invalid" && (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(179,38,30,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="error" style={{ fontSize: 28, color: "var(--error)" }} />
                </div>
              </div>
              <p style={{ fontSize: 14, color: "var(--on-surface)", lineHeight: 1.6, textAlign: "center", marginBottom: 24 }}>{invalidMsg}</p>
              <Link href="/forgot-password" style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", textAlign: "center", background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
                {t("Request a new link", "Yeni bağlantı iste")}
              </Link>
            </>
          )}

          {phase === "done" && (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(46,125,50,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check_circle" style={{ fontSize: 28, color: "var(--success, #2e7d32)" }} />
                </div>
              </div>
              <p style={{ fontSize: 14, color: "var(--on-surface)", lineHeight: 1.6, textAlign: "center" }}>
                {t("Password updated. Redirecting to login…", "Şifre güncellendi. Girişe yönlendiriliyorsunuz…")}
              </p>
            </>
          )}

          {(phase === "form" || phase === "saving") && (
            <>
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.5, marginBottom: 24 }}>
                {t("Choose a new password. Minimum 8 characters with at least one letter and one digit.", "Yeni şifrenizi belirleyin. En az 8 karakter, en az bir harf ve bir rakam içermeli.")}
              </p>

              {error && (
                <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--error-container)", color: "var(--error)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="error" style={{ fontSize: 18 }} />{error}
                </div>
              )}

              <form onSubmit={submit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--on-surface-variant)", marginBottom: 8 }}>{t("New password", "Yeni şifre")}</label>
                  <div style={{ position: "relative" }}>
                    <Icon name="lock" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline)" }} />
                    <input type={showPw ? "text" : "password"} required autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...input, paddingRight: 44 }} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex" }}>
                      <Icon name={showPw ? "visibility_off" : "visibility"} style={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--on-surface-variant)", marginBottom: 8 }}>{t("Confirm password", "Şifre tekrar")}</label>
                  <div style={{ position: "relative" }}>
                    <Icon name="lock" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline)" }} />
                    <input type={showPw ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={input} autoComplete="new-password" />
                  </div>
                </div>

                <button type="submit" disabled={phase === "saving"} style={{
                  width: "100%", padding: "14px 0", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", cursor: phase === "saving" ? "wait" : "pointer",
                  background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: phase === "saving" ? 0.6 : 1,
                }}>
                  {phase === "saving"
                    ? (<><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Updating…", "Güncelleniyor…")}</>)
                    : (<>{t("Set new password", "Yeni şifreyi kaydet")}<Icon name="check" style={{ fontSize: 16 }} /></>)}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
