"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  siteContentApi,
  settingsApi,
  type LocalizedField,
  type LanguageDto,
  type UiStringDto,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import LangTabBar from "@/components/LangTabBar";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   UI String editor — translations only.

   Key, group and description are fixed by the seed.
   Editors update only the per-language values.
   ═══════════════════════════════════════════════ */

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
const label: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--outline)",
  marginBottom: 6,
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
const monoMeta: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--on-surface-variant)",
};

export default function UiStringEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useI18n();

  // Block accidental access to /new — strings cannot be created from the UI.
  useEffect(() => {
    if (id === "new") router.replace("/site-content/ui-strings");
  }, [id, router]);

  const [original, setOriginal] = useState<UiStringDto | null>(null);
  const [values, setValues] = useState<LocalizedField>({});
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
    siteContentApi.getUiString(id).then(r => {
      if (r.success && r.data) {
        setOriginal(r.data);
        setValues(r.data.values ?? {});
      } else {
        toast(r.message || t("Could not load UI string.", "Arayüz metni yüklenemedi."), "error");
        router.push("/site-content/ui-strings");
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setValue = (langCode: string, value: string) => {
    setValues(v => ({ ...v, [langCode]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!original) return;
    setSaving(true);
    const payload = {
      key: original.key,
      group: original.group,
      description: original.description,
      values,
    };
    const r = await siteContentApi.updateUiString(id, payload as never);
    if (r.success) {
      toast(t("UI string saved.", "Arayüz metni kaydedildi."), "success");
      setTimeout(() => router.push("/site-content/ui-strings"), 700);
    } else {
      toast(r.message || t("Save failed.", "Kaydetme başarısız."), "error");
    }
    setSaving(false);
  };

  if (loading || !original) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading UI string…", "Arayüz metni yükleniyor…")}</p>
    </div>
  );

  const langLabel = langs.find(l => l.code === activeLang)?.nativeName || activeLang;
  const value = values[activeLang] ?? "";
  const isLong = value.length > 80 || value.includes("\n");
  const filledCount = Object.values(values).filter(v => v && v.trim()).length;
  const totalLangs = langs.length || Object.keys(values).length || 1;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", marginBottom: 8 }}>
        <button onClick={() => router.push("/site-content/ui-strings")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />{t("UI Strings", "Arayüz Metinleri")}
        </button>
        <span style={{ color: "var(--outline-variant)" }}>/</span>
        <span style={{ color: "var(--on-surface-variant)", fontWeight: 500 }}>{original.key}</span>
      </div>

      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>
        {t("Edit translations", "Çevirileri düzenle")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 24 }}>
        {t("Update existing values per language. Key and group are fixed.", "Her dil için değerleri güncelleyin. Anahtar ve grup sabittir.")}
      </p>

      <form onSubmit={submit}>
        <div style={sectionCard}>
          <h3 style={sectionTitle}>
            <Icon name="fingerprint" style={{ fontSize: 18 }} />
            {t("Identity", "Kimlik")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div>
              <span style={label}>{t("Key", "Anahtar")}</span>
              <span style={monoMeta}>{original.key}</span>
            </div>
            <div>
              <span style={label}>{t("Group", "Grup")}</span>
              <span style={monoMeta}>{original.group}</span>
            </div>
          </div>
          {original.description && (
            <div style={{ marginTop: 14 }}>
              <span style={label}>{t("About this string", "Bu metin hakkında")}</span>
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", margin: 0 }}>{original.description}</p>
            </div>
          )}
        </div>

        <div style={sectionCard}>
          <h3 style={sectionTitle}>
            <Icon name="translate" style={{ fontSize: 18 }} />
            {t("Translations", "Çeviriler")}
          </h3>

          {langs.length > 0 && (
            <LangTabBar langs={langs} activeLang={activeLang} onSelect={setActiveLang} />
          )}

          <span style={label}>{t("Value", "Değer")} · {langLabel}</span>
          {isLong ? (
            <textarea
              value={value}
              onChange={e => setValue(activeLang, e.target.value)}
              placeholder={`${t("Value in", "Değer —")} ${langLabel}`}
              style={textareaBase}
            />
          ) : (
            <input
              value={value}
              onChange={e => setValue(activeLang, e.target.value)}
              placeholder={`${t("Value in", "Değer —")} ${langLabel}`}
              style={inputBase}
            />
          )}
          <p style={{ fontSize: 11, color: "var(--outline-variant)", marginTop: 6 }}>
            {filledCount} / {totalLangs} {t("languages translated", "dil çevrildi")}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => router.push("/site-content/ui-strings")}
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
