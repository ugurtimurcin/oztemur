"use client";
import { useEffect, useMemo, useState } from "react";
import {
  settingsApi,
  translationsApi,
  type LanguageDto,
  type TranslationApplyReport,
  type TranslationExportMode,
  type TranslationSummary,
  type TranslationValidateReport,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const cardStyle: React.CSSProperties = {
  background: "var(--surface-lowest)",
  borderRadius: 12,
  padding: "24px 28px",
  boxShadow: "var(--shadow-ambient)",
  marginBottom: 16,
};
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 };
const inputBase: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" };

const MODE_OPTIONS: { value: TranslationExportMode; labelEn: string; labelTr: string; hintEn: string; hintTr: string }[] = [
  { value: "outdated", labelEn: "Only what needs work", labelTr: "Sadece eksikler", hintEn: "Missing + stale rows", hintTr: "Eksik + güncelliğini yitiren satırlar" },
  { value: "missing",  labelEn: "Only missing",          labelTr: "Sadece eksikler (boş)", hintEn: "Rows with no translation yet", hintTr: "Hiç çevirisi olmayan satırlar" },
  { value: "all",      labelEn: "Everything",            labelTr: "Tümü",          hintEn: "Full catalog incl. up-to-date rows", hintTr: "Güncel olanlar dahil her şey" },
];

export default function TranslationsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [languages, setLanguages] = useState<LanguageDto[]>([]);
  const [defaultLang, setDefaultLang] = useState<string>("tr");
  const [target, setTarget] = useState<string>("");
  const [mode, setMode] = useState<TranslationExportMode>("outdated");
  const [summary, setSummary] = useState<TranslationSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [xlsxBase64, setXlsxBase64] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [validation, setValidation] = useState<TranslationValidateReport | null>(null);
  const [applyResult, setApplyResult] = useState<TranslationApplyReport | null>(null);

  // Load language list once. The first non-default language becomes the
  // default target so admins don't have to pick before they see numbers.
  useEffect(() => {
    (async () => {
      const r = await settingsApi.getLanguages();
      if (!r.success || !r.data) { toast(t("Failed to load languages.", "Diller yüklenemedi."), "error"); return; }
      setLanguages(r.data);
      const def = r.data.find(l => l.isDefault);
      if (def) setDefaultLang(def.code);
      // Prefer the first non-default as initial target (the common case is
      // "I want to translate to X"). Fall back to the default itself so the
      // page is useful when only one language exists — the admin can still
      // bulk-edit Turkish via Excel.
      const firstNonDefault = r.data.find(l => !l.isDefault);
      setTarget(firstNonDefault?.code ?? def?.code ?? "");
    })();

  }, []);

  // Show every published language in the picker. Picking the source
  // language activates bulk-edit mode (export Turkish, edit in Excel,
  // re-import) — see <c>sameLanguage</c> branches further down.
  const pickableLanguages = useMemo(() => languages, [languages]);
  const sameLanguage = target.length > 0 && target === defaultLang;

  // Refresh summary whenever target changes.
  useEffect(() => {
    if (!target) { setSummary(null); return; }
    (async () => {
      setLoadingSummary(true);
      const r = await translationsApi.summary(target);
      setSummary(r.success && r.data ? r.data : null);
      setLoadingSummary(false);
    })();
  }, [target]);

  // Bulk-edit mode only exports the full catalogue — "missing/outdated"
  // filters don't have a stable meaning in same-lang mode, so we force
  // the mode back to "all" the moment the admin picks the source lang.
  useEffect(() => {
    if (sameLanguage && mode !== "all") setMode("all");
  }, [sameLanguage, mode]);

  const handleDownload = async () => {
    if (!target) return;
    setDownloading(true);
    const r = await translationsApi.exportXlsx(target, mode);
    setDownloading(false);
    if (!r) { toast(t("Export failed.", "Dışa aktarma başarısız."), "error"); return; }
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t("Excel file downloaded.", "Excel dosyası indirildi."), "success");
  };

  const handleFile = async (f: File | null) => {
    setFile(f);
    setValidation(null);
    setApplyResult(null);
    if (!f) { setXlsxBase64(""); return; }
    // ArrayBuffer → base64 in chunks. btoa() chokes on long argument
    // strings, so we feed it 32 KiB at a time.
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    setXlsxBase64(btoa(binary));
  };

  const handleValidate = async () => {
    if (!xlsxBase64) { toast(t("Choose an Excel file first.", "Önce bir Excel dosyası seçin."), "warning"); return; }
    setValidating(true);
    setApplyResult(null);
    const r = await translationsApi.validate(xlsxBase64);
    setValidating(false);
    if (!r.success || !r.data) { toast(r.message || t("Validation failed.", "Doğrulama başarısız."), "error"); return; }
    setValidation(r.data);
  };

  const handleApply = async () => {
    if (!validation) return;
    const ok = await confirm({
      title: t("Apply Translations", "Çevirileri Uygula"),
      description: t(
        `${validation.applicable} row(s) will be written to the database. This will update content visible to site visitors. Continue?`,
        `${validation.applicable} satır veritabanına yazılacak. Bu işlem siteyi ziyaret edenlere görünen içeriği güncelleyecek. Devam edilsin mi?`),
      confirmLabel: t("Apply", "Uygula"),
      variant: "info",
    });
    if (!ok) return;
    setApplying(true);
    const r = await translationsApi.apply(xlsxBase64);
    setApplying(false);
    if (!r.success || !r.data) { toast(r.message || t("Import failed.", "İçe aktarma başarısız."), "error"); return; }
    setApplyResult(r.data);
    toast(t(`${r.data.applied} translation(s) applied.`, `${r.data.applied} çeviri uygulandı.`), "success");
    // Refresh the summary now that things have changed.
    const s = await translationsApi.summary(target);
    if (s.success && s.data) setSummary(s.data);
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>
          {t("Translation Transfer", "Çeviri Aktarımı")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4, maxWidth: 720 }}>
          {t(
            "Export the entire content catalog as an Excel file, hand it to a translator, then re-import the filled workbook. Stale translations (where the Turkish source was edited after the translation was imported) are flagged so you can re-send only what changed.",
            "Tüm içerik kataloğunu Excel dosyası olarak dışa aktarıp çevirmene gönderebilir, doldurulmuş dosyayı geri yükleyebilirsiniz. Türkçe kaynağı çeviriden sonra düzenlenen satırlar 'güncelliğini yitirdi' olarak işaretlenir; bu sayede yalnızca değişeni yeniden gönderirsiniz."
          )}
        </p>
      </div>

      {/* ── Target language picker ─────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={lbl}>{t("Target language", "Hedef dil")}</label>
            {pickableLanguages.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--outline)" }}>
                {t("Add a language under Settings → Languages first.", "Önce Ayarlar → Diller bölümünden bir dil ekleyin.")}
              </p>
            ) : (
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                style={inputBase as React.CSSProperties}
              >
                {pickableLanguages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag || "🌐"} {l.name} ({l.code})</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--outline)", paddingBottom: 8 }}>
            {t("Source", "Kaynak")}: <strong style={{ color: "var(--on-surface)" }}>{defaultLang}</strong>
          </div>
        </div>

        {target && (sameLanguage ? (
          // Source-language bulk-edit: no source/target split, so the only
          // meaningful states are "blank" and "filled".
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
            <Chip color="var(--primary)" label={t("Total", "Toplam")} value={summary?.total ?? "—"} loading={loadingSummary} />
            <Chip color="#c0392b"        label={t("Empty", "Boş")}    value={summary?.missing ?? "—"}  loading={loadingSummary} />
            <Chip color="#2e7d32"        label={t("Filled", "Dolu")}  value={summary?.upToDate ?? "—"} loading={loadingSummary} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
            <Chip color="var(--primary)" label={t("Total", "Toplam")} value={summary?.total ?? "—"} loading={loadingSummary} />
            <Chip color="#c0392b"        label={t("Missing", "Eksik")}        value={summary?.missing ?? "—"}    loading={loadingSummary} />
            <Chip color="#d68910"        label={t("Stale", "Güncel değil")}    value={summary?.stale ?? "—"}      loading={loadingSummary} />
            <Chip color="#2e7d32"        label={t("Up-to-date", "Güncel")}    value={summary?.upToDate ?? "—"}   loading={loadingSummary} />
          </div>
        ))}

        {sameLanguage && target && (
          <p style={{ marginTop: 14, padding: "10px 14px", background: "var(--surface)", borderLeft: "3px solid var(--primary)", fontSize: 12, color: "var(--on-surface-variant)" }}>
            {t(
              "Source-language bulk edit: the exported Excel contains a single editable column with all Turkish text. Update what you need and re-import — sections, projects, etc. don't need to be edited one by one.",
              "Kaynak dili toplu düzenleme: Excel'de tüm Türkçe metinlerin bulunduğu tek bir düzenlenebilir sütun gelir. İhtiyacın olan satırları güncelle ve geri yükle — sayfa bölümlerini, projeleri vb. tek tek açmak zorunda kalmazsın."
            )}
          </p>
        )}
      </div>

      {/* ── Export ─────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon name="download" style={{ fontSize: 20, color: "var(--primary)" }} />
          {t("Export to Excel", "Excel Olarak Dışa Aktar")}
        </div>

        {sameLanguage ? (
          <p style={{ marginBottom: 18, fontSize: 12, color: "var(--outline)" }}>
            {t(
              "Mode selector hidden — bulk-edit always exports every Turkish field (including the empty ones so you can spot and fill them).",
              "Mod seçici gizli — toplu düzenleme her zaman tüm Türkçe alanları (boş olanlar dahil, görüp doldurabilesin diye) dışa aktarır."
            )}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
            {MODE_OPTIONS.map(opt => {
              const active = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: active ? "2px solid var(--primary)" : "1px solid rgba(198,197,212,0.3)",
                    background: active ? "var(--primary-fixed)" : "var(--surface)",
                    cursor: "pointer",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--primary)" : "var(--on-surface)" }}>
                    {t(opt.labelEn, opt.labelTr)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--outline)", marginTop: 2 }}>
                    {t(opt.hintEn, opt.hintTr)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={!target || downloading}
          style={{
            padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
            border: "none", cursor: target && !downloading ? "pointer" : "not-allowed",
            opacity: target && !downloading ? 1 : 0.55,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}
        >
          <Icon name="download" style={{ fontSize: 18 }} />
          {downloading ? t("Preparing…", "Hazırlanıyor…") : t("Download Excel", "Excel İndir")}
        </button>
      </div>

      {/* ── Import ─────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--on-surface)", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon name="upload_file" style={{ fontSize: 20, color: "var(--primary)" }} />
          {t("Import filled Excel file", "Doldurulmuş Excel'i İçe Aktar")}
        </div>

        <p style={{ fontSize: 12, color: "var(--outline)", marginBottom: 12 }}>
          {t(
            "The translator fills the rightmost column and sends the file back. We validate first (no writes), show a report, then ask you to confirm before applying.",
            "Çevirmen en sağdaki sütunu doldurup dosyayı geri gönderir. Önce doğrularız (yazma yok), bir rapor gösteririz, sonra uygulama onayını isteriz."
          )}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <label
            htmlFor="xlsx-input"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              border: "1px dashed rgba(198,197,212,0.5)",
              color: "var(--on-surface)", cursor: "pointer", background: "var(--surface)",
            }}
          >
            <Icon name="upload_file" style={{ fontSize: 18 }} />
            {file ? file.name : t("Choose an Excel file", "Bir Excel dosyası seçin")}
          </label>
          <input
            id="xlsx-input"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <button
              type="button"
              onClick={() => { setFile(null); setXlsxBase64(""); setValidation(null); setApplyResult(null); }}
              style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, color: "var(--outline)", background: "transparent", border: "1px solid rgba(198,197,212,0.3)", cursor: "pointer" }}
            >
              {t("Clear", "Temizle")}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleValidate}
            disabled={!xlsxBase64 || validating}
            style={{
              padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              color: "var(--primary)", background: "var(--surface)",
              border: "1.5px solid var(--primary)",
              cursor: xlsxBase64 && !validating ? "pointer" : "not-allowed",
              opacity: xlsxBase64 && !validating ? 1 : 0.55,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Icon name="search" style={{ fontSize: 16 }} />
            {validating ? t("Checking…", "Kontrol ediliyor…") : t("Validate (dry run)", "Doğrula (deneme)")}
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!validation || validation.applicable === 0 || applying}
            style={{
              padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
              border: "none",
              cursor: (validation && validation.applicable > 0 && !applying) ? "pointer" : "not-allowed",
              opacity: (validation && validation.applicable > 0 && !applying) ? 1 : 0.55,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Icon name="check" style={{ fontSize: 16 }} />
            {applying ? t("Applying…", "Uygulanıyor…") : t("Apply", "Uygula")}
          </button>
        </div>

        {validation && (
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 10, background: "var(--surface)", border: "1px solid rgba(198,197,212,0.25)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 10 }}>
              {t("Validation Report", "Doğrulama Raporu")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, auto)", columnGap: 24, rowGap: 4, fontSize: 13 }}>
              <Stat label={t("Total rows", "Toplam satır")}  value={validation.totalRows} />
              <Stat label={t("Will write", "Yazılacak")}     value={validation.applicable} color="var(--primary)" />
              <Stat label={t("Unchanged", "Değişmeyen")}     value={validation.unchanged} />
              <Stat label={t("Skipped", "Atlanan")}          value={validation.skipped}   color="#d68910" />
              <Stat label={t("Errors", "Hata")}              value={validation.errors}    color="#c0392b" />
            </div>
            {validation.issues.length > 0 && <IssueList issues={validation.issues} />}
          </div>
        )}

        {applyResult && (
          <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 10, background: "rgba(46,125,50,0.06)", border: "1px solid rgba(46,125,50,0.3)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="check_circle" style={{ fontSize: 18 }} />
              {t(`Applied ${applyResult.applied} translation(s) across ${applyResult.entitiesTouched} item(s).`,
                 `${applyResult.entitiesTouched} öğe içinde ${applyResult.applied} çeviri uygulandı.`)}
            </div>
            {applyResult.issues.length > 0 && <IssueList issues={applyResult.issues} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, color, loading }: { label: string; value: number | string; color: string; loading: boolean }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--surface)", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--outline)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--outline)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--on-surface)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function IssueList({ issues }: { issues: { lineNumber: number; entityType: string; fieldPath: string; status: string; message: string | null }[] }) {
  const visible = issues.slice(0, 50);
  return (
    <div style={{ marginTop: 14, maxHeight: 260, overflowY: "auto", borderTop: "1px solid rgba(198,197,212,0.25)", paddingTop: 12 }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "var(--outline)", textAlign: "left" }}>
            <th style={{ padding: "4px 8px", fontWeight: 700 }}>#</th>
            <th style={{ padding: "4px 8px", fontWeight: 700 }}>Type</th>
            <th style={{ padding: "4px 8px", fontWeight: 700 }}>Field</th>
            <th style={{ padding: "4px 8px", fontWeight: 700 }}>Status</th>
            <th style={{ padding: "4px 8px", fontWeight: 700 }}>Message</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((i, idx) => (
            <tr key={idx} style={{ borderTop: "1px solid rgba(198,197,212,0.15)" }}>
              <td style={{ padding: "4px 8px", color: "var(--outline)" }}>{i.lineNumber}</td>
              <td style={{ padding: "4px 8px" }}>{i.entityType}</td>
              <td style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: 11 }}>{i.fieldPath}</td>
              <td style={{ padding: "4px 8px", fontWeight: 700, color: i.status === "error" ? "#c0392b" : "#d68910" }}>{i.status}</td>
              <td style={{ padding: "4px 8px", color: "var(--on-surface-variant)" }}>{i.message ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {issues.length > visible.length && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--outline)" }}>
          + {issues.length - visible.length} more…
        </div>
      )}
    </div>
  );
}
