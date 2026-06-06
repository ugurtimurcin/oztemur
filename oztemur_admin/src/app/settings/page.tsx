"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { settingsApi, type LanguageDto, type LanguageReadinessDto } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useI18n, type Locale } from "@/lib/i18n";
import Icon from "@/components/Icon";
import SettingsTabs from "./SettingsTabs";

const cardStyle: React.CSSProperties = { background: "var(--surface-lowest)", borderRadius: 12, padding: "24px 28px", boxShadow: "var(--shadow-ambient)", marginBottom: 16 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" };

const emptyForm = { code: "", name: "", nativeName: "", flag: "", isDefault: false, displayOrder: 0 };

export default function SettingsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t, locale } = useI18n();
  const [languages, setLanguages] = useState<LanguageDto[]>([]);
  const [readiness, setReadiness] = useState<Record<string, LanguageReadinessDto>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await settingsApi.getLanguages();
    if (r.success && r.data) {
      setLanguages(r.data);
      // Fetch readiness for non-default langs in parallel.
      const drafts = r.data.filter(l => !l.isDefault);
      const results = await Promise.all(drafts.map(l => settingsApi.getLanguageReadiness(l.code)));
      const map: Record<string, LanguageReadinessDto> = {};
      drafts.forEach((l, i) => {
        const res = results[i];
        if (res.success && res.data) map[l.code] = res.data;
      });
      setReadiness(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) => setForm(f => ({ ...f, [k]: v }));

  const submitLanguage = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) { toast(t("Code and Name are required.", "Kod ve Ad zorunludur."), "warning"); return; }
    setSaving(true);
    const r = await settingsApi.createLanguage(form as never);
    if (r.success) {
      toast(t("Language added as draft. Fill translations to publish.", "Dil taslak olarak eklendi. Yayınlamak için çevirileri doldurun."), "success");
      setShowForm(false);
      setForm(emptyForm);
      load();
    } else {
      toast(r.message || t("Failed.", "Başarısız."), "error");
    }
    setSaving(false);
  };

  const toggleActive = async (lang: LanguageDto) => {
    const r = await settingsApi.updateLanguage(lang.id, {
      name: lang.name, nativeName: lang.nativeName, flag: lang.flag,
      isDefault: lang.isDefault, isActive: !lang.isActive, displayOrder: lang.displayOrder,
    });
    if (r.success) {
      toast(!lang.isActive
        ? t(`${lang.name} published.`, `${lang.name} yayınlandı.`)
        : t(`${lang.name} unpublished.`, `${lang.name} yayından kaldırıldı.`), "success");
      load();
    }
    else toast(r.message || t("Failed.", "Başarısız."), "error");
  };

  const deleteLang = async (lang: LanguageDto) => {
    const ok = await confirm({
      title: t("Delete Language", "Dili Sil"),
      description: t(
        `Are you sure you want to delete "${lang.name} (${lang.code})"? Content translations in this language will remain in the database but will not be displayed.`,
        `"${lang.name} (${lang.code})" dilini silmek istediğinize emin misiniz? Bu dildeki çeviriler veritabanında kalır ancak gösterilmez.`),
      confirmLabel: t("Delete", "Sil"),
      variant: "danger",
    });
    if (!ok) return;
    const r = await settingsApi.deleteLanguage(lang.id);
    if (r.success) { toast(t("Language deleted.", "Dil silindi."), "success"); load(); }
    else toast(r.message || t("Failed.", "Başarısız."), "error");
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <SettingsTabs />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Language Settings", "Dil Ayarları")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {t("New languages start as", "Yeni diller")} <strong>{t("drafts", "taslak")}</strong>{t(". Fill every entry under", " olarak başlar.")} <Link href="/site-content/pages" style={{ color: "var(--primary)", fontWeight: 600 }}>{t("Page Content", "Sayfa İçeriği")}</Link> {t("and", "ve")} <Link href="/site-content/ui-strings" style={{ color: "var(--primary)", fontWeight: 600 }}>{t("UI Strings", "Arayüz Metinleri")}</Link> {t("before publishing.", "altındaki her alanı doldurduktan sonra yayınlayın.")}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,6,102,0.18)" }}>
          <Icon name={showForm ? "close" : "add"} style={{ fontSize: 18 }} />
          {showForm ? t("Cancel", "Vazgeç") : t("Add Language", "Dil Ekle")}
        </button>
      </div>

      {/* Add Language Form */}
      {showForm && (
        <form onSubmit={submitLanguage} style={{ ...cardStyle, border: "2px solid var(--primary)", borderColor: "rgba(0,6,102,0.15)" }}>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Icon name="translate" style={{ fontSize: 20 }} />{t("New Language", "Yeni Dil")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 80px", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>{t("Code", "Kod")} *</label>
              <input value={form.code} onChange={e => set("code", e.target.value)} placeholder="de" maxLength={5} style={inputBase} />
            </div>
            <div>
              <label style={lbl}>{t("Name", "Ad")} *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="German" style={inputBase} />
            </div>
            <div>
              <label style={lbl}>{t("Native Name", "Yerel Ad")}</label>
              <input value={form.nativeName} onChange={e => set("nativeName", e.target.value)} placeholder="Deutsch" style={inputBase} />
            </div>
            <div>
              <label style={lbl}>{t("Flag", "Bayrak")}</label>
              <input value={form.flag} onChange={e => set("flag", e.target.value)} placeholder="🇩🇪" style={{ ...inputBase, fontSize: 20, textAlign: "center" }} />
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ padding: "10px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? t("Saving…", "Kaydediliyor…") : t("Add Language", "Dil Ekle")}
          </button>
        </form>
      )}

      {/* Language List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {languages.map(lang => {
            const rd = readiness[lang.code];
            const canPublish = lang.isDefault || lang.isActive || (rd?.isReady ?? false);
            const isExpanded = !!expanded[lang.code];
            const buckets = rd ? bucketRows(rd, locale) : [];
            const totalMissing = buckets.reduce((sum, b) => sum + b.bucket.missing.length, 0);
            return (
              <div key={lang.id} style={{ ...cardStyle, marginBottom: 0, transition: "opacity .2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, opacity: lang.isActive ? 1 : 0.85 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 28 }}>{lang.flag || "🌐"}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {lang.nativeName || lang.name}
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--outline)", textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--surface)", padding: "2px 8px", borderRadius: 4 }}>{lang.code}</span>
                        {lang.isDefault && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--primary-fixed)", padding: "2px 8px", borderRadius: 4 }}>{t("Default", "Varsayılan")}</span>}
                        {lang.isActive
                          ? <span style={{ fontSize: 10, fontWeight: 800, color: "var(--success, #2e7d32)", textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--success-container, #e6f4ea)", padding: "2px 8px", borderRadius: 4 }}>{t("Published", "Yayında")}</span>
                          : <span style={{ fontSize: 10, fontWeight: 800, color: "var(--warning, #8a6d3b)", textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--warning-container, #fff3cd)", padding: "2px 8px", borderRadius: 4 }}>{t("Draft", "Taslak")}</span>
                        }
                      </div>
                      <div style={{ fontSize: 12, color: "var(--outline)", marginTop: 2 }}>{lang.name}{!lang.isActive && ` · ${t("Not visible to visitors", "Ziyaretçilere görünmüyor")}`}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => toggleActive(lang)}
                      disabled={!canPublish}
                      title={
                        lang.isActive
                          ? t("Unpublish (hide from public site)", "Yayından kaldır (herkese açık siteden gizle)")
                          : canPublish
                            ? t("Publish (make visible to visitors)", "Yayınla (ziyaretçilere göster)")
                            : t(`Fill ${totalMissing} missing translation(s) before publishing`, `Yayınlamadan önce ${totalMissing} eksik çeviriyi doldurun`)
                      }
                      style={{
                        display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", borderRadius: 8,
                        border: "1px solid rgba(198,197,212,0.3)",
                        background: lang.isActive ? "var(--surface)" : canPublish ? "var(--primary)" : "var(--surface)",
                        color: lang.isActive ? "var(--on-surface)" : canPublish ? "#fff" : "var(--outline-variant)",
                        cursor: canPublish ? "pointer" : "not-allowed",
                        fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                        opacity: canPublish ? 1 : 0.6,
                      }}
                    >
                      <Icon name={lang.isActive ? "visibility_off" : canPublish ? "rocket_launch" : "lock"} style={{ fontSize: 16 }} />
                      {lang.isActive ? t("Unpublish", "Yayından Kaldır") : t("Publish", "Yayınla")}
                    </button>
                    {!lang.isDefault && (
                      <button onClick={() => deleteLang(lang)} title={t("Delete", "Sil")} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(198,197,212,0.3)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="delete" style={{ fontSize: 18, color: "var(--error)" }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Readiness progress — only for non-default draft languages */}
                {!lang.isDefault && !lang.isActive && rd && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(198,197,212,0.25)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                      {buckets.map(row => (
                        <ProgressRow key={row.label} label={row.label} filled={row.bucket.filled} total={row.bucket.total} href={row.href} />
                      ))}
                    </div>
                    {totalMissing > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(p => ({ ...p, [lang.code]: !p[lang.code] }))}
                        style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "transparent", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Icon name={isExpanded ? "expand_less" : "expand_more"} style={{ fontSize: 16 }} />
                        {isExpanded
                          ? t("Hide missing entries", "Eksik alanları gizle")
                          : t(`Show ${totalMissing} missing entr${totalMissing === 1 ? "y" : "ies"}`, `${totalMissing} eksik alanı göster`)}
                      </button>
                    )}
                    {isExpanded && totalMissing > 0 && (
                      <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--surface)", borderRadius: 8, fontSize: 12, maxHeight: 320, overflowY: "auto" }}>
                        {buckets.filter(r => r.bucket.missing.length > 0).map((row, idx, arr) => (
                          <div key={row.label} style={{ marginBottom: idx < arr.length - 1 ? 14 : 0 }}>
                            <div style={{ fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, marginBottom: 6 }}>
                              {row.label} ({row.bucket.missing.length})
                            </div>
                            {row.bucket.missing.map((m, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0", color: "var(--on-surface)" }}>
                                <span style={{ color: "var(--outline)" }}>{m.location}</span>
                                <span style={{ color: "var(--outline)" }}>›</span>
                                <span style={{ fontWeight: 600 }}>{m.key}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {languages.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--outline)" }}>
              <Icon name="translate" style={{ fontSize: 48, opacity: 0.3, display: "block", marginInline: "auto", marginBottom: 12 }} />
              <p style={{ fontWeight: 600 }}>{t("No languages configured.", "Yapılandırılmış dil yok.")}</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>{t("Click \"Add Language\" to get started.", "Başlamak için \"Dil Ekle\"ye tıklayın.")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Buckets in display order, paired with the admin route an editor would jump to.
// We hide buckets with total = 0 so empty content types don't clutter the panel.
type BucketRow = { label: string; bucket: LanguageReadinessDto["pageContent"]; href: string };
function bucketRows(rd: LanguageReadinessDto, locale: Locale): BucketRow[] {
  const tr = locale === "tr";
  const all: BucketRow[] = [
    { label: tr ? "Sayfa İçeriği" : "Page Content", bucket: rd.pageContent, href: "/site-content/pages" },
    { label: tr ? "Arayüz Metinleri" : "UI Strings", bucket: rd.uiStrings, href: "/site-content/ui-strings" },
    { label: tr ? "Şirketler" : "Companies", bucket: rd.companies, href: "/companies" },
    { label: tr ? "Haberler" : "News", bucket: rd.news, href: "/news" },
    { label: tr ? "Blog" : "Blog", bucket: rd.blog, href: "/blog" },
    { label: tr ? "Projeler" : "Projects", bucket: rd.projects, href: "/projects" },
    { label: tr ? "Kariyer" : "Careers", bucket: rd.careers, href: "/careers" },
    { label: tr ? "Yönetim Kadrosu" : "Leadership", bucket: rd.leadership, href: "/leadership" },
  ];
  return all.filter(r => r.bucket.total > 0);
}

function ProgressRow({ label, filled, total, href }: { label: string; filled: number; total: number; href: string }) {
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  const isComplete = filled === total && total > 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Link href={href} style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <Icon name="arrow_outward" style={{ fontSize: 14, color: "var(--outline)" }} />
        </Link>
        <span style={{ fontSize: 11, fontWeight: 700, color: isComplete ? "var(--success, #2e7d32)" : "var(--outline)", fontVariantNumeric: "tabular-nums" }}>
          {filled} / {total}
        </span>
      </div>
      <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: isComplete ? "var(--success, #2e7d32)" : "var(--primary)", transition: "width .3s" }} />
      </div>
    </div>
  );
}
