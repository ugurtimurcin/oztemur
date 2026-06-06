"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { usersApi, type PermissionModuleDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const cardStyle: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "24px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 16 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" };

// Turkish display names for the permission catalog (catalog itself is English).
const MODULE_TR: Record<string, string> = {
  news: "Haberler", blog: "Blog", projects: "Projeler", companies: "Şirketler",
  careers: "Kariyer", applications: "Başvurular", messages: "Mesajlar",
  leadership: "Yönetim Kadrosu", sitecontent: "Sayfa İçeriği", settings: "Ayarlar",
  users: "Kullanıcılar", audit: "Denetim Kaydı",
};

export default function UserEditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const actionLabel = (a: string) =>
    a === "view" ? t("View", "Görüntüle")
    : a === "edit" ? t("Edit", "Düzenle")
    : a === "delete" ? t("Delete", "Sil")
    : a;
  const moduleLabel = (m: PermissionModuleDto) =>
    locale === "tr" ? (MODULE_TR[m.key] ?? m.label) : m.label;

  const [catalog, setCatalog] = useState<PermissionModuleDto[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const cat = await usersApi.permissionCatalog();
      if (cat.success && cat.data) setCatalog(cat.data);

      if (!isNew) {
        const r = await usersApi.get(id);
        if (r.success && r.data) {
          setFirstName(r.data.firstName);
          setLastName(r.data.lastName);
          setEmail(r.data.email);
          setIsActive(r.data.isActive);
          setPermissions(new Set(r.data.permissions));
        } else {
          toast(r.message || t("User not found.", "Kullanıcı bulunamadı."), "error");
          router.push("/users");
          return;
        }
      }
      setLoading(false);
    })();
  }, [id, isNew, router, toast, t]);

  const allPerms = useMemo(
    () => catalog.flatMap(m => m.actions.map(a => `${m.key}.${a}`)),
    [catalog],
  );
  const allSelected = allPerms.length > 0 && allPerms.every(p => permissions.has(p));

  const toggle = (perm: string) => {
    setPermissions(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleModule = (mod: PermissionModuleDto) => {
    const keys = mod.actions.map(a => `${mod.key}.${a}`);
    const allOn = keys.every(k => permissions.has(k));
    setPermissions(prev => {
      const next = new Set(prev);
      keys.forEach(k => allOn ? next.delete(k) : next.add(k));
      return next;
    });
  };

  const toggleAll = () => {
    setPermissions(allSelected ? new Set() : new Set(allPerms));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) { toast(t("Name and email are required.", "Ad ve e-posta zorunludur."), "warning"); return; }
    if (isNew && !password) { toast(t("A password is required for new users.", "Yeni kullanıcı için şifre zorunludur."), "warning"); return; }
    if (password && password !== confirmPassword) { toast(t("Passwords do not match.", "Şifreler eşleşmiyor."), "warning"); return; }

    setSaving(true);
    const perms = [...permissions];
    const r = isNew
      ? await usersApi.create({ firstName, lastName, email, password, permissions: perms })
      : await usersApi.update(id, { firstName, lastName, email, password: password || undefined, isActive, permissions: perms });

    if (r.success) {
      toast(isNew ? t("User created.", "Kullanıcı oluşturuldu.") : t("User updated.", "Kullanıcı güncellendi."), "success");
      router.push("/users");
    } else {
      toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
    </div>
  );

  return (
    <form onSubmit={submit} style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button type="button" onClick={() => router.push("/users")} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(198,197,212,0.3)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="arrow_back" style={{ fontSize: 18, color: "var(--outline)" }} />
        </button>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>
          {isNew ? t("New User", "Yeni Kullanıcı") : t("Edit User", "Kullanıcıyı Düzenle")}
        </h1>
      </div>

      {/* Account */}
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>{t("First Name", "Ad")} *</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputBase} />
          </div>
          <div>
            <label style={lbl}>{t("Last Name", "Soyad")}</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputBase} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>{t("Email", "E-posta")} *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputBase} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>{isNew ? `${t("Password", "Şifre")} *` : t("New Password", "Yeni Şifre")}</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isNew ? "" : t("Leave blank to keep current", "Mevcut şifreyi korumak için boş bırakın")}
                style={{ ...inputBase, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label={t("Toggle password visibility", "Şifre görünürlüğü")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex" }}>
                <Icon name={showPw ? "visibility_off" : "visibility"} style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
          <div>
            <label style={lbl}>{t("Confirm Password", "Şifre (Tekrar)")}{isNew ? " *" : ""}</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder={isNew ? "" : t("Repeat the new password", "Yeni şifreyi tekrar girin")}
                style={{ ...inputBase, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label={t("Toggle password visibility", "Şifre görünürlüğü")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex" }}>
                <Icon name={showPw ? "visibility_off" : "visibility"} style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        </div>
        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button type="button" onClick={() => setIsActive(v => !v)} style={{ position: "relative", width: 48, height: 26, borderRadius: 9999, background: isActive ? "var(--primary)" : "var(--outline-variant)", border: "none", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: isActive ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "left .2s" }} />
            </button>
            <span style={{ fontSize: 13, color: "var(--on-surface)" }}>
              {isActive
                ? t("Account active — the user can sign in.", "Hesap aktif — kullanıcı giriş yapabilir.")
                : t("Account disabled — the user cannot sign in.", "Hesap devre dışı — kullanıcı giriş yapamaz.")}
            </span>
          </div>
        )}
      </div>

      {/* Permissions */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>{t("Permissions", "İzinler")}</div>
            <p style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{t("Decides which modules and actions this user can reach.", "Bu kullanıcının hangi modüllere ve işlemlere erişebileceğini belirler.")}</p>
          </div>
          <button type="button" onClick={toggleAll} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid rgba(198,197,212,0.3)", background: "var(--surface)", color: "var(--on-surface-variant)", cursor: "pointer" }}>
            {allSelected ? t("Clear all", "Tümünü kaldır") : t("Grant all", "Tümünü ver")}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {catalog.map(mod => {
            const keys = mod.actions.map(a => `${mod.key}.${a}`);
            const allOn = keys.every(k => permissions.has(k));
            return (
              <div key={mod.key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 12px", borderRadius: 8, background: "var(--surface)" }}>
                <button type="button" onClick={() => toggleModule(mod)} style={{ width: 150, textAlign: "left", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: allOn ? "var(--primary)" : "var(--on-surface)" }}>
                  {moduleLabel(mod)}
                </button>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {mod.actions.map(action => {
                    const perm = `${mod.key}.${action}`;
                    const on = permissions.has(perm);
                    return (
                      <label key={perm} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--on-surface-variant)" }}>
                        <input type="checkbox" checked={on} onChange={() => toggle(perm)} style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }} />
                        {actionLabel(action)}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={saving} style={{ padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? t("Saving…", "Kaydediliyor…") : isNew ? t("Create User", "Kullanıcı Oluştur") : t("Save Changes", "Değişiklikleri Kaydet")}
        </button>
        <button type="button" onClick={() => router.push("/users")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", background: "var(--surface)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer" }}>
          {t("Cancel", "Vazgeç")}
        </button>
      </div>
    </form>
  );
}
