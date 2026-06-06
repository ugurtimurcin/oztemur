"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { projectsApi, getMediaUrl, loc, hasPermission, type ProjectDto, type LanguageDto, settingsApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const PAGE_SIZE = 24;
const FEATURED_CAP = 4;

// Localizes the raw ProjectStatus enum value the API returns into the
// active admin language. Unknown values fall through unchanged so a new
// backend status doesn't render as blank while the FE catches up.
function statusLabel(status: string, tr: (en: string, tr: string) => string): string {
  switch (status) {
    case "Planning":    return tr("Planning",    "Planlama");
    case "InProgress":  return tr("In Progress", "Devam Ediyor");
    case "Operational": return tr("Operational", "Faaliyette");
    case "Completed":   return tr("Completed",   "Tamamlandı");
    case "OnHold":      return tr("On Hold",     "Beklemede");
    default:            return status;
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const canEdit = hasPermission("projects.edit");
  const canDelete = hasPermission("projects.delete");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [langs, setLangs] = useState<LanguageDto[]>([]);
  const [listLang, setListLang] = useState("tr");

  // Drag-and-drop reorder — same pattern as the Leadership list.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const featuredCount = projects.filter(p => p.isFeatured).length;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const r = await projectsApi.getProjects(p, PAGE_SIZE);
    if (r.success && r.data) {
      setProjects(r.data.items);
      setTotalCount(r.data.totalCount);
      setTotalPages(Math.max(1, Math.ceil(r.data.totalCount / r.data.pageSize)));
    } else {
      setError(r.message || t("Failed to load projects.", "Projeler yüklenemedi."));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(page); }, [load, page]);

  useEffect(() => {
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) setLangs(r.data);
    });
  }, []);

  const onDragStart = (e: React.DragEvent, idx: number) => {
    if (!canEdit) return;
    setDragIdx(idx);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.4"; }, 0);
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
    const items = [...projects];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(targetIdx, 0, moved);
    setProjects(items);
    setDragIdx(null);
    setOverIdx(null);
    setReordering(true);
    // Page-relative ordering — DisplayOrder offset by the current page's
    // first absolute index so reorders on later pages don't collide with
    // earlier pages' orders.
    const offset = (page - 1) * PAGE_SIZE;
    const payload = items.map((p, i) => ({ id: p.id, displayOrder: offset + i }));
    const r = await projectsApi.reorderProjects(payload);
    if (r.success) toast(t("Display order saved.", "Sıralama kaydedildi."), "success");
    else { toast(t("Failed to save order.", "Sıralama kaydedilemedi."), "error"); load(page); }
    setReordering(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("Delete Project", "Projeyi Sil"),
      description: t(`Permanently delete the project "${name}"? This action cannot be undone.`, `"${name}" projesi kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`),
      confirmLabel: t("Delete", "Sil"),
      variant: "danger",
    });
    if (!ok) return;
    const r = await projectsApi.deleteProject(id);
    if (r.success) { toast(t("Project deleted.", "Proje silindi."), "success"); load(page); }
    else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading projects…", "Projeler yükleniyor…")}</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <Icon name="error" style={{ fontSize: 48, color: "var(--error)", marginBottom: 12, display: "block", marginInline: "auto" }} />
      <p style={{ fontSize: 14, color: "var(--error)", fontWeight: 600 }}>{error}</p>
      <button onClick={() => load(page)} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "var(--primary-fixed)", border: "none", cursor: "pointer" }}>{t("Retry", "Tekrar Dene")}</button>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Projects", "Projeler")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {t("Manage operational and planned projects.", "Devam eden ve planlanan projeleri yönetin.")}
          </p>
        </div>
        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/projects/new")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,6,102,0.2)", transition: "box-shadow .2s, transform .15s" }}>
              <Icon name="add" style={{ fontSize: 18 }} />{t("Add Project", "Proje Ekle")}
            </button>
          </div>
        )}
      </div>

      {/* Listing meta row — language toggle on the left, featured-count
          indicator on the right so admin always sees how many slots are
          used. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16 }}>
        {langs.length > 1 ? (
          <div style={{ display: "flex", gap: 8, background: "var(--surface)", padding: 6, borderRadius: 10, width: "fit-content" }}>
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
        ) : <span />}

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: featuredCount > 0 ? "var(--primary-fixed)" : "var(--surface)", borderRadius: 9999, border: "1px solid rgba(198,197,212,0.3)" }}>
          <Icon name="home" style={{ fontSize: 14, color: featuredCount > 0 ? "var(--primary)" : "var(--outline-variant)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: featuredCount > 0 ? "var(--primary)" : "var(--outline)", fontVariantNumeric: "tabular-nums" }}>
            {t(`${featuredCount} / ${FEATURED_CAP} on homepage`, `${featuredCount} / ${FEATURED_CAP} anasayfada`)}
          </span>
        </div>
      </div>

      {canEdit && projects.length > 1 && (
        <p style={{ fontSize: 11, color: "var(--on-surface-variant)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="drag_indicator" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
          {reordering
            ? t("Saving display order…", "Sıralama kaydediliyor…")
            : t("Drag and drop cards to reorder. The order shows on the public Projects page.", "Kartları sürükleyerek sıralayın. Sıra herkese açık Projeler sayfasında geçerli olur.")}
        </p>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", marginBottom: 20 }}>
            <Icon name="foundation" style={{ fontSize: 36, color: "var(--primary)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>{t("No projects yet", "Henüz proje yok")}</p>
          <p style={{ fontSize: 13, color: "var(--outline)", marginTop: 6, maxWidth: 320, textAlign: "center" }}>{t("Create your first project to populate the showcase.", "Vitrini doldurmak için ilk projenizi oluşturun.")}</p>
          {canEdit && (
            <button onClick={() => router.push("/projects/new")} style={{ marginTop: 20, padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer" }}>
              <Icon name="add" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />{t("Create Project", "Proje Oluştur")}
            </button>
          )}
        </div>
      )}

      {/* Card Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {projects.map((project, idx) => {
          const isOver = overIdx === idx && dragIdx !== idx;
          return (
            <div
              key={project.id}
              draggable={canEdit}
              onDragStart={e => onDragStart(e, idx)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              style={{
                position: "relative",
                background: "var(--surface-lowest)",
                borderRadius: 14,
                boxShadow: "var(--shadow-ambient)",
                transition: "box-shadow 0.2s, transform 0.2s, outline-color 0.2s",
                overflow: "hidden",
                outline: isOver ? "2px dashed var(--primary)" : "2px dashed transparent",
                outlineOffset: 2,
              }}
            >
              {/* Drop-target indicator — thin top accent strip with subtle
                  drag-grip pattern so admin sees the card is draggable. */}
              {canEdit && (
                <div style={{ height: 6, background: "linear-gradient(90deg, transparent, rgba(198,197,212,0.35) 50%, transparent)", cursor: "grab" }} title={t("Drag to reorder", "Sıralamak için sürükle")} />
              )}
              {/* Card Header — Logo + Info */}
              <div
                onClick={() => router.push(`/projects/${project.id}`)}
                style={{ display: "flex", gap: 16, padding: "20px 20px 0", cursor: "pointer" }}
              >

                {/* Logo */}
                <div style={{
                  width: 52, height: 52, borderRadius: 10, background: "var(--surface)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0, border: "1px solid rgba(198,197,212,0.2)",
                }}>
                  {project.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(project.imageUrl)}
                      alt={loc(project.title, listLang)}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <Icon name="foundation" style={{ fontSize: 24, color: "var(--outline-variant)" }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {project.isFeatured && (
                      <Icon
                        name="home"
                        title={t("Featured on homepage", "Anasayfada öne çıkan")}
                        style={{ fontSize: 16, color: "var(--primary)", flexShrink: 0 }}
                      />
                    )}
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, margin: 0 }}>
                      {loc(project.title, listLang)}
                    </h3>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 9999,
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em",
                      background: project.status === "Completed" || project.status === "Operational" ? "var(--success-container)" : "var(--primary-fixed)",
                      color: project.status === "Completed" || project.status === "Operational" ? "var(--success)" : "var(--primary)",
                      flexShrink: 0,
                    }}>
                      {statusLabel(project.status, t)}
                    </span>
                  </div>
                  {loc(project.category, listLang) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Icon name="category" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                      <span style={{ fontSize: 12, color: "var(--outline)", fontWeight: 500 }}>{loc(project.category, listLang)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description preview */}
              {loc(project.description, listLang) && (
                <p style={{
                  fontSize: 12, lineHeight: 1.5, color: "var(--on-surface-variant)",
                  padding: "10px 20px 0 20px", margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                }}>
                  {loc(project.description, listLang)}
                </p>
              )}

              {/* Card Footer — Meta + Actions */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", marginTop: 12,
                borderTop: "1px solid rgba(198,197,212,0.12)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {project.year && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="event" style={{ fontSize: 14, color: "var(--outline-variant)" }} />
                      <span style={{ fontSize: 11, color: "var(--outline)" }}>{project.year}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 4 }}>
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}
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
                      onClick={e => { e.stopPropagation(); handleDelete(project.id, loc(project.title, listLang)); }}
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
            </div>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
    </div>
  );
}
