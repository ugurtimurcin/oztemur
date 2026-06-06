"use client";
import { useState, useRef, useCallback, type DragEvent } from "react";
import { uploadFile, getMediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   FileUpload — Premium drag-and-drop uploader
   With preview, progress indicator, and remove
   ═══════════════════════════════════════════════ */

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  hint?: string;
  variant?: "logo" | "cover";
}

export default function FileUpload({ value, onChange, label, accept = "image/*", hint, variant = "cover" }: Props) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const r = await uploadFile(file);
    if (r.success && r.data) {
      onChange(r.data.url);
    } else {
      setError(r.message || t("Upload failed.", "Yükleme başarısız."));
    }
    setUploading(false);
  }, [onChange, t]);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = () => setDragActive(false);

  const previewUrl = value ? getMediaUrl(value) : "";
  const isImage = value && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value);
  const isLogo = variant === "logo";

  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 }}>{label ?? t("Upload File", "Dosya Yükle")}</label>

      {/* Current file preview */}
      {value && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 12,
          padding: isLogo ? "16px 20px" : 0,
          background: "var(--surface-low)", borderRadius: 10, overflow: "hidden",
          ...(isLogo ? {} : { flexDirection: "column" as const }),
        }}>
          {isImage && (
            <div style={{
              width: isLogo ? 64 : "100%", height: isLogo ? 64 : 160,
              borderRadius: isLogo ? 8 : "10px 10px 0 0",
              overflow: "hidden", background: "var(--surface)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: isLogo ? "contain" : "cover" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <div style={{
            flex: 1, minWidth: 0,
            padding: isLogo ? 0 : "12px 16px 14px",
            ...(isLogo ? {} : { width: "100%" }),
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {isImage ? t("Image uploaded", "Görsel yüklendi") : t("File uploaded", "Dosya yüklendi")}
                </p>
                <p style={{ fontSize: 11, color: "var(--outline)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {value}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--error)", display: "flex", flexShrink: 0 }}
              >
                <Icon name="delete" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? "var(--primary)" : "rgba(198,197,212,0.4)"}`,
          borderRadius: 10,
          padding: value ? "20px 24px" : "36px 24px",
          textAlign: "center" as const,
          cursor: "pointer",
          background: dragActive ? "var(--primary-fixed)" : uploading ? "var(--surface-low)" : "var(--surface)",
          transition: "all .2s",
          position: "relative" as const,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          style={{ display: "none" }}
        />

        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>{t("Uploading…", "Yükleniyor…")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: dragActive ? "var(--primary)" : "rgba(0,6,102,0.06)",
              transition: "background .2s",
            }}>
              <Icon name={value ? "sync" : "cloud_upload"} style={{ fontSize: 22, color: dragActive ? "#fff" : "var(--primary)" }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface)" }}>
              {value ? t("Replace file", "Dosyayı değiştir") : t("Drop file here, or click to browse", "Dosyayı buraya bırakın ya da tıklayıp seçin")}
            </p>
            <p style={{ fontSize: 11, color: "var(--outline-variant)" }}>
              {hint || t("JPG, PNG, WebP, SVG up to 10MB", "JPG, PNG, WebP, SVG · en fazla 10MB")}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "var(--error-container)", color: "var(--error)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="error" style={{ fontSize: 14 }} />{error}
        </div>
      )}
    </div>
  );
}
