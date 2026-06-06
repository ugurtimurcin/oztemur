"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  siteContentApi,
  settingsApi,
  uploadFile,
  getMediaUrl,
  type LocalizedField,
  type LanguageDto,
  type PageSectionDto,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import LangTabBar from "@/components/LangTabBar";
import { getPageMeta } from "@/lib/sitePages";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

// Field keys whose value is a media URL (image or video) get a file
// upload widget instead of a text input. Also picks up the legacy
// `member\d+_photo` shape used by the leadership section.
const MEDIA_KEY_RE = /(?:Media|Image|Photo|Video)$|_(?:image|photo|video|media)$/;
const VIDEO_RE = /\.(mp4|webm|mov|ogv|m4v)(\?.*)?$/i;

function isMediaField(key: string): boolean {
  return MEDIA_KEY_RE.test(key);
}
function activeCompanionFor(key: string): string {
  return `${key}Active`;
}

/* ═══════════════════════════════════════════════
   Page Section editor — translations only.

   The set of fields is fixed by the seed and matches
   the frontend component. Editors update existing
   values per language; structure (page key, section
   key, field keys, isActive) is locked.
   ═══════════════════════════════════════════════ */

interface FormState {
  fields: Record<string, LocalizedField>;
}

const sectionCard: React.CSSProperties = {
  background: "var(--surface-lowest)",
  borderRadius: 12,
  padding: "24px 28px",
  boxShadow: "var(--shadow-ambient)",
  marginBottom: 16,
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "'Manrope',sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--primary)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 18,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 14,
  background: "var(--surface)",
  color: "var(--on-surface)",
  border: "1px solid rgba(198,197,212,0.3)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color .2s, box-shadow .2s",
};
const textareaBase: React.CSSProperties = {
  ...inputBase,
  minHeight: 80,
  resize: "vertical",
  lineHeight: 1.5,
};
const monoTag: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 6,
  background: "var(--primary-fixed)",
  color: "var(--primary)",
};
const monoMeta: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--on-surface-variant)",
};

/* ───────────────────────────────────────────────
   Media field editor — upload widget + preview +
   "Publish this media" toggle. The URL is shared
   across all languages; the toggle decides whether
   the public site uses this media or falls back
   to its hardcoded default.
   ─────────────────────────────────────────────── */
function MediaFieldBlock({
  fieldKey,
  url,
  activeValue,
  hasActiveCompanion,
  onUrlChange,
  onActiveChange,
}: {
  fieldKey: string;
  url: string;
  activeValue: string | undefined;
  hasActiveCompanion: boolean;
  onUrlChange: (url: string) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const r = await uploadFile(file);
    if (r.success && r.data) {
      onUrlChange(r.data.url);
    } else {
      setError(r.message || t("Upload failed.", "Yükleme başarısız."));
    }
    setUploading(false);
  }, [onUrlChange, t]);

  const isVideo = !!url && VIDEO_RE.test(url);
  const previewUrl = url ? getMediaUrl(url) : "";
  const isPublished = activeValue === "true";

  return (
    <div style={{ background: "var(--surface)", borderRadius: 8, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ ...monoTag, background: "var(--tertiary-fixed)", color: "var(--on-tertiary-fixed-variant)" }}>{fieldKey}</span>
        <span style={{ fontSize: 10, color: "var(--outline)", fontWeight: 500 }}>
          {isVideo ? t("Video media", "Video medya") : url ? t("Image media", "Görsel medya") : t("No media uploaded yet", "Henüz medya yüklenmedi")}
        </span>
      </div>

      {/* Preview */}
      {url && (
        <div style={{
          marginBottom: 12,
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--surface-low)",
          aspectRatio: "16 / 9",
          position: "relative",
        }}>
          {isVideo ? (
            <video
              src={previewUrl}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {!isPublished && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              padding: "4px 10px", borderRadius: 9999,
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              background: "rgba(0,0,0,0.65)", color: "#fff",
              backdropFilter: "blur(8px)",
            }}>
              {t("Draft — not on page", "Taslak — sayfada değil")}
            </div>
          )}
        </div>
      )}

      {/* Upload row */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: "var(--primary)", background: "var(--primary-fixed)",
            border: "1px solid rgba(0,6,102,0.1)", cursor: uploading ? "wait" : "pointer",
          }}
        >
          {uploading ? (
            <>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
              {t("Uploading…", "Yükleniyor…")}
            </>
          ) : (
            <>
              <Icon name={url ? "sync" : "cloud_upload"} style={{ fontSize: 16 }} />
              {url ? t("Replace media", "Medyayı değiştir") : t("Upload image or video", "Görsel veya video yükle")}
            </>
          )}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => { onUrlChange(""); if (hasActiveCompanion) onActiveChange(false); }}
            style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: "var(--error)", background: "var(--error-container)",
              border: "1px solid rgba(255,0,0,0.05)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Icon name="delete" style={{ fontSize: 16 }} />
            {t("Remove", "Kaldır")}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          style={{ display: "none" }}
        />
      </div>

      {/* Optional manual URL paste */}
      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: 11, color: "var(--outline)", cursor: "pointer", fontWeight: 500 }}>
          {t("Or paste a URL manually", "Veya URL'yi elle yapıştırın")}
        </summary>
        <input
          value={url}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="/uploads/2026/... or https://..."
          style={{ ...inputBase, marginTop: 8, fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12 }}
        />
      </details>

      {/* Publish toggle */}
      {hasActiveCompanion && (
        <label
          style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 14,
            padding: "10px 12px", borderRadius: 8,
            background: isPublished ? "rgba(0,150,80,0.08)" : "var(--surface-low)",
            border: `1px solid ${isPublished ? "rgba(0,150,80,0.2)" : "rgba(198,197,212,0.3)"}`,
            cursor: "pointer", transition: "all .2s",
          }}
        >
          <input
            type="checkbox"
            checked={isPublished}
            onChange={e => onActiveChange(e.target.checked)}
            disabled={!url}
            style={{ width: 16, height: 16, accentColor: "var(--success, var(--primary))", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface)" }}>
              {t("Publish this media", "Bu medyayı yayınla")}
            </div>
            <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 2 }}>
              {!url
                ? t("Upload a file first.", "Önce bir dosya yükleyin.")
                : isPublished
                  ? t("Live — visitors see this on the public page.", "Yayında — ziyaretçiler herkese açık sayfada bunu görür.")
                  : t("Draft — the page keeps showing its built-in default until you publish.", "Taslak — yayınlayana kadar sayfa varsayılan içeriği gösterir.")}
            </div>
          </div>
        </label>
      )}

      {error && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "var(--error-container)", color: "var(--error)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="error" style={{ fontSize: 14 }} />{error}
        </div>
      )}
    </div>
  );
}

export default function SectionEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useI18n();

  // Block accidental access to /new — sections cannot be created from the UI.
  useEffect(() => {
    if (id === "new") router.replace("/site-content/pages");
  }, [id, router]);

  const [form, setForm] = useState<FormState>({ fields: {} });
  const [original, setOriginal] = useState<PageSectionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState("tr");
  const [langs, setLangs] = useState<LanguageDto[]>([]);

  useEffect(() => {
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) {
        const all = r.data;
        setLangs(all);
        if (all.some(l => l.code === "tr")) setActiveLang("tr");
        else {
          const def = all.find(l => l.isDefault);
          if (def) setActiveLang(def.code);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (id === "new") return;
    siteContentApi.getSection(id).then(r => {
      if (r.success && r.data) {
        setOriginal(r.data);
        setForm({ fields: r.data.fields ?? {} });
      } else {
        toast(r.message || t("Could not load section.", "Bölüm yüklenemedi."), "error");
        router.push("/site-content/pages");
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fieldKeys = useMemo(() => Object.keys(form.fields), [form.fields]);

  const updateValue = (fieldKey: string, langCode: string, value: string) => {
    setForm(f => ({
      ...f,
      fields: {
        ...f.fields,
        [fieldKey]: { ...(f.fields[fieldKey] ?? {}), [langCode]: value },
      },
    }));
  };

  // Write the same value into every language slot — used by media
  // upload + the Publish toggle, where one decision applies globally.
  const setAllLangs = (fieldKey: string, value: string) => {
    setForm(f => {
      const existing = f.fields[fieldKey] ?? Object.fromEntries(langs.map(l => [l.code, ""]));
      const next: Record<string, string> = {};
      const keys = Object.keys(existing).length > 0 ? Object.keys(existing) : langs.map(l => l.code);
      for (const k of keys) next[k] = value;
      return { ...f, fields: { ...f.fields, [fieldKey]: next } };
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!original) return;
    setSaving(true);
    // Preserve every immutable property; only fields change.
    const payload = {
      pageKey: original.pageKey,
      sectionKey: original.sectionKey,
      description: original.description,
      isActive: original.isActive,
      fields: form.fields,
    };
    const r = await siteContentApi.updateSection(id, payload as never);
    if (r.success) {
      toast(t("Section saved.", "Bölüm kaydedildi."), "success");
      setTimeout(() => router.push(`/site-content/pages/${encodeURIComponent(original.pageKey)}`), 700);
    } else {
      toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    }
    setSaving(false);
  };

  if (loading || !original) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading section…", "Bölüm yükleniyor…")}</p>
    </div>
  );

  const langLabel = langs.find(l => l.code === activeLang)?.nativeName || activeLang;

  return (
    <div style={{ maxWidth: 880 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/site-content/pages")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />{t("Page Content", "Sayfa İçeriği")}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <button onClick={() => router.push(`/site-content/pages/${encodeURIComponent(original.pageKey)}`)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", fontSize: 13, fontWeight: 500 }}>
          {getPageMeta(original.pageKey).label}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>
          {original.sectionKey}
        </span>
      </div>

      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>
        {t("Edit translations", "Çevirileri düzenle")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 24 }}>
        {t("Update existing values per language. Structure (keys, fields, layout) is fixed by the frontend.", "Her dil için değerleri güncelleyin. Yapı (anahtarlar, alanlar, yerleşim) frontend tarafından sabittir.")}
      </p>

      <form onSubmit={submit}>
        {/* ── Identity (read-only context) ───────── */}
        <div style={sectionCard}>
          <h3 style={sectionTitle}>
            <Icon name="fingerprint" style={{ fontSize: 18 }} />
            {t("Identity", "Kimlik")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 }}>{t("Page", "Sayfa")}</span>
              <span style={monoMeta}>{original.pageKey}</span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 }}>{t("Section", "Bölüm")}</span>
              <span style={monoMeta}>{original.sectionKey}</span>
            </div>
          </div>
          {original.description && (
            <div style={{ marginTop: 14 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 }}>{t("About this section", "Bu bölüm hakkında")}</span>
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: 0 }}>{original.description}</p>
            </div>
          )}
        </div>

        {/* ── Translations ──────────────────────── */}
        <div style={sectionCard}>
          <h3 style={sectionTitle}>
            <Icon name="translate" style={{ fontSize: 18 }} />
            {t("Translations", "Çeviriler")} ({fieldKeys.length})
          </h3>

          {langs.length > 0 && (
            <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} />
          )}

          {fieldKeys.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", border: "2px dashed rgba(198,197,212,0.3)", borderRadius: 8 }}>
              <Icon name="info" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: 8, display: "block", marginInline: "auto" }} />
              <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>
                {t("This section has no translatable fields.", "Bu bölümde çevrilebilir alan yok.")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {fieldKeys.map(key => {
                // Skip companion *Active fields — they're rendered inside their
                // media-field block as a Publish toggle.
                const isActiveCompanion = /Active$/.test(key) && fieldKeys.includes(key.slice(0, -"Active".length)) && isMediaField(key.slice(0, -"Active".length));
                if (isActiveCompanion) return null;

                if (isMediaField(key)) {
                  return (
                    <MediaFieldBlock
                      key={key}
                      fieldKey={key}
                      url={form.fields[key]?.[activeLang] ?? ""}
                      activeValue={form.fields[activeCompanionFor(key)]?.[activeLang]}
                      hasActiveCompanion={fieldKeys.includes(activeCompanionFor(key))}
                      onUrlChange={url => setAllLangs(key, url)}
                      onActiveChange={v => setAllLangs(activeCompanionFor(key), v ? "true" : "false")}
                    />
                  );
                }

                const value = form.fields[key]?.[activeLang] ?? "";
                const filled = Object.entries(form.fields[key] ?? {}).filter(([, v]) => v && v.trim()).length;
                const total = langs.length || Object.keys(form.fields[key] ?? {}).length || 1;
                const isLong = (value?.length ?? 0) > 80 || value?.includes("\n");

                return (
                  <div key={key} style={{ background: "var(--surface)", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={monoTag}>{key}</span>
                      <span style={{ fontSize: 10, color: "var(--outline)", fontWeight: 500 }}>
                        {filled}/{total} {t("translated", "çevrildi")}
                      </span>
                    </div>
                    {isLong ? (
                      <textarea
                        value={value}
                        onChange={e => updateValue(key, activeLang, e.target.value)}
                        placeholder={`${t("Value in", "Değer —")} ${langLabel}`}
                        style={textareaBase}
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={e => updateValue(key, activeLang, e.target.value)}
                        placeholder={`${t("Value in", "Değer —")} ${langLabel}`}
                        style={inputBase}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Actions ───────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => router.push(`/site-content/pages/${encodeURIComponent(original.pageKey)}`)}
            style={{ padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--on-surface-variant)", background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer" }}
          >
            {t("Cancel", "Vazgeç")}
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(0,6,102,0.2)" }}
          >
            {saving ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin .8s linear infinite" }} />
                {t("Saving…", "Kaydediliyor…")}
              </>
            ) : (
              <>
                <Icon name="save" style={{ fontSize: 18 }} />
                {t("Save changes", "Değişiklikleri kaydet")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
