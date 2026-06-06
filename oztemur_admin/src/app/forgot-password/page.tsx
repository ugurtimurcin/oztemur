"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { authResetApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  // Server always returns success regardless of whether the email exists
  // (account-enumeration defence). We mirror the same UX on the client —
  // once submitted, show the success state without revealing anything.
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await authResetApi.forgot(email.trim());
    setLoading(false);
    setSubmitted(true);
  };

  const input: React.CSSProperties = { width: "100%", padding: "14px 16px 14px 44px", borderRadius: 6, fontSize: 14, background: "var(--surface-low)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--surface)", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-30%", right: "-15%", width: "60%", height: "100%", borderRadius: "50%", background: "var(--primary)", opacity: 0.03 }} />
      <div style={{ position: "absolute", bottom: "-25%", left: "-10%", width: "50%", height: "80%", borderRadius: "50%", background: "var(--primary)", opacity: 0.02 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, textAlign: "center" }}>
        <Image src="/logo-seffaf.png" alt="Öztemur Group" width={200} height={56} priority style={{ objectFit: "contain", height: "auto", margin: "0 auto" }} />
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "8px 0 36px" }}>{t("Reset your password", "Şifrenizi sıfırlayın")}</p>

        <div style={{ background: "var(--surface-lowest)", borderRadius: 8, padding: "40px 36px", boxShadow: "var(--shadow-ambient)", textAlign: "left" }}>
          {submitted ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(46,125,50,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check_circle" style={{ fontSize: 28, color: "var(--success, #2e7d32)" }} />
                </div>
              </div>
              <p style={{ fontSize: 14, color: "var(--on-surface)", lineHeight: 1.6, textAlign: "center", marginBottom: 16 }}>
                {t(
                  "If this email exists in the system, a reset link is on its way. Check your inbox in a few moments.",
                  "Eğer bu e-posta sistemde kayıtlıysa, sıfırlama bağlantısı kısa süre içinde gelecektir. Birkaç dakika içinde gelen kutunuzu kontrol edin."
                )}
              </p>
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.5, textAlign: "center", marginBottom: 24 }}>
                {t("The link expires in 1 hour.", "Bağlantı 1 saat sonra geçersiz olacaktır.")}
              </p>
              <Link href="/login" style={{ display: "block", width: "100%", padding: "12px 0", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", textAlign: "center", background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}>
                {t("Back to login", "Girişe dön")}
              </Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", lineHeight: 1.5, marginBottom: 24 }}>
                {t(
                  "Enter the email address associated with your account. We'll send a link to reset your password.",
                  "Hesabınızla ilişkili e-posta adresini girin. Şifrenizi sıfırlamak için bir bağlantı göndereceğiz."
                )}
              </p>
              <form onSubmit={submit}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--on-surface-variant)", marginBottom: 8 }}>{t("Email", "E-posta")}</label>
                  <div style={{ position: "relative" }}>
                    <Icon name="mail" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline)" }} />
                    <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="name@corporate.com" style={input} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "14px 0", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", cursor: loading ? "wait" : "pointer",
                  background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1,
                }}>
                  {loading
                    ? (<><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Sending…", "Gönderiliyor…")}</>)
                    : (<>{t("Send reset link", "Sıfırlama bağlantısı gönder")}<Icon name="arrow_outward" style={{ fontSize: 16 }} /></>)}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link href="/login" style={{ fontSize: 12, color: "var(--on-surface-variant)", textDecoration: "none" }}>
                  ← {t("Back to login", "Girişe dön")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
