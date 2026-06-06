"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { cmsApi, settingsApi, getMediaUrl, loc, hasPermission, type CompanyDto, type LanguageDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

/* ═══════════════════════════════════════════════
   Companies — Premium Draggable Card Grid
   Sorted by displayOrder, drag to reorder, auto-persist
   ═══════════════════════════════════════════════ */

export default function CompaniesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const canEdit = hasPermission("companies.edit");
  const canDelete = hasPermission("companies.delete");
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const [langs, setLangs] = useState<LanguageDto[]>([]);
  const [listLang, setListLang] = useState("tr");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await cmsApi.getCompanies();
    if (r.success && r.data) {
      const sorted = [...r.data.items].sort((a, b) => a.displayOrder - b.displayOrder);
      setCompanies(sorted);
    } else {
      setError(r.message || t("Failed to load companies.", "Şirketler yüklenemedi."));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { 
    load(); 
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) setLangs(r.data);
    });
  }, [load]);

  // ─── Drag Handlers ──────────────────────────────
  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    // Make ghost semi-transparent
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.35";
    }, 0);
  };

  const onDragEnd = () => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    setDragIdx(null);
    setOverIdx(null);
  };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx === null || dragIdx === idx) return;
    setOverIdx(idx);
  };

  const onDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;

    const items = [...companies];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(targetIdx, 0, moved);

    // Update local state immediately for smooth UX
    setCompanies(items);
    setDragIdx(null);
    setOverIdx(null);

    // Persist to backend
    setSaving(true);
    const reorderPayload = items.map((c, i) => ({ id: c.id, displayOrder: i }));
    const r = await cmsApi.reorderCompanies(reorderPayload);
    if (r.success) {
      toast(t("Display order saved.", "Sıralama kaydedildi."), "success");
    } else {
      toast(t("Failed to save order.", "Sıralama kaydedilemedi."), "error");
      load(); // Reload original order on failure
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("Delete Company", "Şirketi Sil"),
      description: t(
        `Are you sure you want to delete "${name}"? This action cannot be undone and will remove all associated data.`,
        `"${name}" şirketini silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve ilişkili tüm veriler silinir.`),
      confirmLabel: t("Delete Company", "Şirketi Sil"),
      variant: "danger",
      icon: "delete_sweep"
    });
    if (!ok) return;

    const r = await cmsApi.deleteCompany(id);
    if (r.success) { toast(t("Company deleted.", "Şirket silindi."), "success"); load(); }
    else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
  };

  // ─── Render ──────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading companies…", "Şirketler yükleniyor…")}</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <Icon name="error" style={{ fontSize: 48, color: "var(--error)", marginBottom: 12, display: "block", marginInline: "auto" }} />
      <p style={{ fontSize: 14, color: "var(--error)", fontWeight: 600 }}>{error}</p>
      <button onClick={load} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "var(--primary-fixed)", border: "none", cursor: "pointer" }}>{t("Retry", "Tekrar Dene")}</button>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Companies", "Şirketler")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {t("Manage your portfolio companies.", "Portföy şirketlerinizi yönetin.")} <span style={{ color: "var(--outline)", fontWeight: 500 }}>{t("Drag to reorder.", "Sıralamak için sürükleyin.")}</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saving && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--primary-fixed)", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
              {t("Saving…", "Kaydediliyor…")}
            </div>
          )}
          {canEdit && (
            <button onClick={() => router.push("/companies/new")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,6,102,0.2)", transition: "box-shadow .2s, transform .15s" }}>
              <Icon name="add" style={{ fontSize: 18 }} />{t("Add Company", "Şirket Ekle")}
            </button>
          )}
        </div>
      </div>

      {/* Language Toggle for Listing */}
      {langs.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "var(--surface)", padding: 6, borderRadius: 10, width: "fit-content" }}>
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => setListLang(l.code)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: listLang === l.code ? "var(--primary)" : "transparent",
                color: listLang === l.code ? "#fff" : "var(--outline)",
                transition: "all .2s"
              }}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {companies.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", marginBottom: 20 }}>
            <Icon name="business" style={{ fontSize: 36, color: "var(--primary)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>{t("No companies yet", "Henüz şirket yok")}</p>
          <p style={{ fontSize: 13, color: "var(--outline)", marginTop: 6, maxWidth: 320, textAlign: "center" }}>{t("Add your first portfolio company to get started.", "Başlamak için ilk portföy şirketinizi ekleyin.")}</p>
          {canEdit && (
            <button onClick={() => router.push("/companies/new")} style={{ marginTop: 20, padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer" }}>
              <Icon name="add" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />{t("Create Company", "Şirket Oluştur")}
            </button>
          )}
        </div>
      )}

      {/* Card Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {companies.map((company, idx) => {
          const isOver = overIdx === idx && dragIdx !== idx;
          const isDragging = dragIdx === idx;

          return (
            <div
              key={company.id}
              draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              style={{
                position: "relative",
                background: "var(--surface-lowest)",
                borderRadius: 14,
                boxShadow: isOver
                  ? "0 0 0 2px var(--primary), 0 8px 24px -4px rgba(0,6,102,0.12)"
                  : isDragging
                  ? "0 12px 30px -8px rgba(0,0,0,0.15)"
                  : "var(--shadow-ambient)",
                transition: "box-shadow 0.2s, transform 0.2s",
                transform: isOver ? "scale(1.01)" : isDragging ? "scale(0.97)" : "scale(1)",
                cursor: "grab",
                overflow: "hidden",
              }}
            >
              {/* Card Header — Logo + Info */}
              <div
                onClick={() => router.push(`/companies/${company.id}`)}
                style={{ display: "flex", gap: 16, padding: "20px 20px 0", cursor: "pointer" }}
              >
                {/* Drag handle */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "0 4px", flexShrink: 0, cursor: "grab" }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <Icon name="drag_indicator" style={{ fontSize: 20, color: "var(--outline-variant)" }} />
                </div>

                {/* Logo */}
                <div style={{
                  width: 52, height: 52, borderRadius: 10, background: "var(--surface)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0, border: "1px solid rgba(198,197,212,0.2)",
                }}>
                  {company.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(company.logoUrl)}
                      alt={loc(company.name, listLang)}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <Icon name="business" style={{ fontSize: 24, color: "var(--outline-variant)" }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, margin: 0 }}>
                      {loc(company.name, listLang)}
                    </h3>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 9999,
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em",
                      background: company.isActive ? "var(--success-container)" : "var(--error-container)",
                      color: company.isActive ? "var(--success)" : "var(--error)",
                      flexShrink: 0,
                    }}>
                      {company.isActive ? t("Active", "Aktif") : t("Inactive", "Pasif")}
                    </span>
                  </div>
                  {loc(company.sector, listLang) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Icon name="category" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                      <span style={{ fontSize: 12, color: "var(--outline)", fontWeight: 500 }}>{loc(company.sector, listLang)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description preview */}
              {loc(company.description, listLang) && (
                <p style={{
                  fontSize: 12, lineHeight: 1.5, color: "var(--on-surface-variant)",
                  padding: "10px 20px 0 92px", margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                }}>
                  {loc(company.description, listLang)}
                </p>
              )}

              {/* Card Footer — Meta + Actions */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", marginTop: 12,
                borderTop: "1px solid rgba(198,197,212,0.12)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {company.contactEmail && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="mail" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                      <span style={{ fontSize: 11, color: "var(--outline)" }}>{company.contactEmail}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="reorder" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                    <span style={{ fontSize: 11, color: "var(--outline)", fontFamily: "monospace" }}>#{idx + 1}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 4 }}>
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/companies/${company.id}`); }}
                      style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", transition: "color .15s, background .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "var(--primary-fixed)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}
                      title={t("Edit", "Düzenle")}
                    >
                      <Icon name="edit" style={{ fontSize: 18 }} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(company.id, loc(company.name, listLang)); }}
                      style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex", transition: "color .15s, background .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "var(--error-container)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}
                      title={t("Delete", "Sil")}
                    >
                      <Icon name="delete" style={{ fontSize: 18 }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Drop indicator line */}
              {isOver && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: "var(--primary)", borderRadius: "3px 3px 0 0",
                  animation: "fadeIn 0.15s ease-out",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
