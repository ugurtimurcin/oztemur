"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { cmsApi, settingsApi, getMediaUrl, loc, hasPermission, type LeadershipMemberDto, type LanguageDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

export default function LeadershipPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const canEdit = hasPermission("leadership.edit");
  const canDelete = hasPermission("leadership.delete");
  const [members, setMembers] = useState<LeadershipMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const [langs, setLangs] = useState<LanguageDto[]>([]);
  const [listLang, setListLang] = useState("tr");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await cmsApi.getLeadership();
    if (r.success && r.data) {
      const sorted = [...r.data].sort((a, b) => a.displayOrder - b.displayOrder);
      setMembers(sorted);
    } else {
      setError(r.message || t("Failed to load leadership members.", "Yönetim kadrosu yüklenemedi."));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
    settingsApi.getLanguages().then(r => {
      if (r.success && r.data) setLangs(r.data);
    });
  }, [load]);

  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.35"; }, 0);
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
    const items = [...members];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(targetIdx, 0, moved);
    setMembers(items);
    setDragIdx(null);
    setOverIdx(null);
    setSaving(true);
    const payload = items.map((m, i) => ({ id: m.id, displayOrder: i }));
    const r = await cmsApi.reorderLeadership(payload);
    if (r.success) toast(t("Display order saved.", "Sıralama kaydedildi."), "success");
    else { toast(t("Failed to save order.", "Sıralama kaydedilemedi."), "error"); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("Delete Leadership Member", "Üyeyi Sil"),
      description: t(
        `Are you sure you want to delete "${name}"? This will remove the member from the public site.`,
        `"${name}" üyesini silmek istediğinize emin misiniz? Üye herkese açık siteden kaldırılacak.`),
      confirmLabel: t("Delete", "Sil"),
      variant: "danger",
      icon: "delete_sweep",
    });
    if (!ok) return;
    const r = await cmsApi.deleteLeadershipMember(id);
    if (r.success) { toast(t("Member deleted.", "Üye silindi."), "success"); load(); }
    else toast(r.message || t("Delete failed.", "Silme başarısız."), "error");
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "var(--outline)", fontWeight: 500 }}>{t("Loading members…", "Üyeler yükleniyor…")}</p>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Leadership", "Yönetim Kadrosu")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>
            {t("Manage the leadership team shown on the public site.", "Herkese açık sitede gösterilen yönetim kadrosunu yönetin.")} <span style={{ color: "var(--outline)", fontWeight: 500 }}>{t("Drag to reorder. If empty, the section is hidden on the public site.", "Sıralamak için sürükleyin. Boşsa bölüm herkese açık sitede gizlenir.")}</span>
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
            <button onClick={() => router.push("/leadership/new")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,6,102,0.2)" }}>
              <Icon name="add" style={{ fontSize: 18 }} />{t("Add Member", "Üye Ekle")}
            </button>
          )}
        </div>
      </div>

      {langs.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "var(--surface)", padding: 6, borderRadius: 10, width: "fit-content" }}>
          {langs.map(l => (
            <button key={l.code} onClick={() => setListLang(l.code)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
              background: listLang === l.code ? "var(--primary)" : "transparent",
              color: listLang === l.code ? "#fff" : "var(--outline)",
              transition: "all .2s"
            }}>
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px", background: "var(--surface-lowest)", borderRadius: 16, border: "2px dashed rgba(198,197,212,0.3)" }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-fixed)", marginBottom: 20 }}>
            <Icon name="groups" style={{ fontSize: 36, color: "var(--primary)" }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>{t("No leadership members yet", "Henüz yönetim kadrosu üyesi yok")}</p>
          <p style={{ fontSize: 13, color: "var(--outline)", marginTop: 6, maxWidth: 360, textAlign: "center" }}>{t("Until at least one active member is added, the Leadership section is hidden from the public site.", "En az bir aktif üye eklenene kadar Yönetim Kadrosu bölümü herkese açık sitede gizli kalır.")}</p>
          {canEdit && (
            <button onClick={() => router.push("/leadership/new")} style={{ marginTop: 20, padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer" }}>
              <Icon name="add" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }} />{t("Add First Member", "İlk Üyeyi Ekle")}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {members.map((m, idx) => {
          const isOver = overIdx === idx && dragIdx !== idx;
          const isDragging = dragIdx === idx;
          return (
            <div key={m.id} draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              style={{
                position: "relative", background: "var(--surface-lowest)", borderRadius: 14,
                boxShadow: isOver ? "0 0 0 2px var(--primary), 0 8px 24px -4px rgba(0,6,102,0.12)" : isDragging ? "0 12px 30px -8px rgba(0,0,0,0.15)" : "var(--shadow-ambient)",
                transition: "box-shadow .2s, transform .2s",
                transform: isOver ? "scale(1.01)" : isDragging ? "scale(0.97)" : "scale(1)",
                cursor: "grab", overflow: "hidden",
              }}
            >
              <div onClick={() => router.push(`/leadership/${m.id}`)} style={{ cursor: "pointer" }}>
                <div style={{ aspectRatio: "4 / 5", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getMediaUrl(m.photoUrl)} alt={loc(m.name, listLang)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: m.isActive ? "none" : "grayscale(1) opacity(0.5)" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--outline-variant)" }}>
                      <Icon name="person" style={{ fontSize: 64 }} />
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 10, left: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="drag_indicator" style={{ fontSize: 12 }} />
                    #{idx + 1}
                  </div>
                  {!m.isActive && (
                    <span style={{ position: "absolute", top: 10, right: 10, padding: "3px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: "var(--error-container)", color: "var(--error)" }}>{t("Hidden", "Gizli")}</span>
                  )}
                </div>
                <div style={{ padding: "14px 16px 4px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    {loc(m.role, listLang) || "—"}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {loc(m.name, listLang) || t("Untitled", "İsimsiz")}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 12px", borderTop: "1px solid rgba(198,197,212,0.12)", gap: 4 }}>
                {canEdit && (
                  <button onClick={e => { e.stopPropagation(); router.push(`/leadership/${m.id}`); }}
                    style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "var(--primary-fixed)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}
                    title={t("Edit", "Düzenle")}
                  >
                    <Icon name="edit" style={{ fontSize: 18 }} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(m.id, loc(m.name, listLang) || t("Untitled", "İsimsiz")); }}
                    style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "var(--outline)", display: "flex" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "var(--error-container)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--outline)"; e.currentTarget.style.background = "none"; }}
                    title={t("Delete", "Sil")}
                  >
                    <Icon name="delete" style={{ fontSize: 18 }} />
                  </button>
                )}
              </div>
              {isOver && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--primary)", borderRadius: "3px 3px 0 0" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
