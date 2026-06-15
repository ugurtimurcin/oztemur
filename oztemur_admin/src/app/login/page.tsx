"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);


  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [authLoading, user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const r = await login(email, password);
    if (r.success) router.push("/");
    else setError(r.message || t("Authentication failed.", "Kimlik doğrulama başarısız."));
    setLoading(false);
  };

  const input: React.CSSProperties = { width: "100%", padding: "14px 16px 14px 44px", borderRadius: 6, fontSize: 14, background: "var(--surface-low)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", transition: "border-color .2s, box-shadow .2s" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--surface)", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: "-30%", right: "-15%", width: "60%", height: "100%", borderRadius: "50%", background: "var(--primary)", opacity: 0.03 }} />
      <div style={{ position: "absolute", bottom: "-25%", left: "-10%", width: "50%", height: "80%", borderRadius: "50%", background: "var(--primary)", opacity: 0.02 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, textAlign: "center" as const }}>
        <Image src="/logo-seffaf.png" alt="Öztemur Group" width={200} height={56} priority style={{ objectFit: "contain", height: "auto", margin: "0 auto" }} />
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: "8px 0 36px" }}>{t("Management Console Access", "Yönetim Konsolu Erişimi")}</p>

        <div style={{ background: "var(--surface-lowest)", borderRadius: 8, padding: "40px 36px", boxShadow: "var(--shadow-ambient)", textAlign: "left" as const }}>
          {error && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--error-container)", color: "var(--error)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="error" style={{ fontSize: 18 }} />{error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--on-surface-variant)", marginBottom: 8 }}>{t("Username or Email", "Kullanıcı Adı veya E-posta")}</label>
              <div style={{ position: "relative" }}>
                <Icon name="mail" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline)" }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@corporate.com" style={input} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--on-surface-variant)" }}>{t("Password", "Şifre")}</label>
                <Link href="/forgot-password" style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>{t("Forgot Password?", "Şifremi Unuttum?")}</Link>
              </div>
              <div style={{ position: "relative" }}>
                <Icon name="lock" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--outline)" }} />
                <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...input, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex" }}>
                  <Icon name={showPw ? "visibility_off" : "visibility"} style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px 0", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.6 : 1, transition: "opacity .2s",
            }}>
              {loading ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} /> {t("Authenticating…", "Doğrulanıyor…")}</> : <>{t("Sign In to Portal", "Portala Giriş Yap")} <Icon name="arrow_forward" style={{ fontSize: 18 }} /></>}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 12, color: "var(--outline)", marginTop: 32 }}>© {new Date().getFullYear()} Öztemur Group of Companies. {t("All rights reserved.", "Tüm hakları saklıdır.")}</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: "@keyframes loginPop { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }" }} />
    </div>
  );
}
