"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { careersApi, getMediaUrl, hasPermission, type JobApplicationDto, type ApplicationReplyDto, ApplicationStatus } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/lib/i18n";
import { safeExternalUrl } from "@/lib/url";
import Icon from "@/components/Icon";

const statusOptions = [
  { value: ApplicationStatus.Pending, color: "#6b7280", bg: "#f3f4f6" },
  { value: ApplicationStatus.Reviewed, color: "#1d4ed8", bg: "#dbeafe" },
  { value: ApplicationStatus.Shortlisted, color: "#6d28d9", bg: "#ede9fe" },
  { value: ApplicationStatus.Interviewing, color: "#1e40af", bg: "#dbeafe" },
  { value: ApplicationStatus.Offered, color: "#4338ca", bg: "#e0e7ff" },
  { value: ApplicationStatus.Hired, color: "#15803d", bg: "#dcfce3" },
  { value: ApplicationStatus.Rejected, color: "#b91c1c", bg: "#fee2e2" },
];

function getInitials(name: string) {
  if (!name) return "??";
  return name.split(" ").filter(n => n.length > 0).map(n => n[0]).join("").substring(0, 3).toUpperCase();
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t, locale } = useI18n();

  const statusLabel = (s: ApplicationStatus): string => {
    switch (s) {
      case ApplicationStatus.Pending:      return t("Pending", "Beklemede");
      case ApplicationStatus.Reviewed:     return t("Reviewed", "İncelendi");
      case ApplicationStatus.Shortlisted:  return t("Shortlisted", "Ön Elemede");
      case ApplicationStatus.Interviewing: return t("Interviewing", "Görüşmede");
      case ApplicationStatus.Offered:      return t("Offered", "Teklif Verildi");
      case ApplicationStatus.Hired:        return t("Hired", "İşe Alındı");
      case ApplicationStatus.Rejected:     return t("Rejected", "Reddedildi");
      default:                             return String(s);
    }
  };

  const [app, setApp] = useState<JobApplicationDto | null>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(ApplicationStatus.Pending);
  const [statusNotes, setStatusNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState<string | null>(null);

  const canEdit = hasPermission("applications.edit");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  // Only one reply is expanded at a time to keep the card compact. We
  // default to the newest reply being open the first time the page loads.
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);
  const [replyDefaultSet, setReplyDefaultSet] = useState(false);
  useEffect(() => {
    if (!replyDefaultSet && app?.replies && app.replies.length > 0) {
      setExpandedReplyId(app.replies[0].id);
      setReplyDefaultSet(true);
    }
  }, [app?.replies, replyDefaultSet]);

  useEffect(() => {
    careersApi.getApplication(id).then(r => {
      if (r.success && r.data) {
        setApp(r.data);
        setSelectedStatus(r.data.status);
        if (r.data.cvBlobPath && r.data.cvBlobPath !== "string") {
          careersApi.downloadCv(r.data.id).then(url => {
            if (url) setCvBlobUrl(url);
          });
        }
      }
      else toast(r.message || t("Failed to load application", "Başvuru yüklenemedi"), "error");
      setLoading(false);
    });
  }, [id, toast, t]);

  const handleSaveStatus = async () => {
    if (!app || selectedStatus === app.status) {
      setIsModalOpen(false);
      return;
    }
    // A finalized application (rejected / hired) is locked — no further changes.
    if (app.status === ApplicationStatus.Rejected || app.status === ApplicationStatus.Hired) {
      toast(t("This application is finalized and can no longer be updated.", "Bu başvuru kesinleşti ve artık güncellenemez."), "error");
      setIsModalOpen(false);
      return;
    }
    setSavingStatus(true);
    const res = await careersApi.updateApplicationStatus(id, selectedStatus, statusNotes);
    if (res.success) {
      const refetch = await careersApi.getApplication(id);
      if (refetch.success && refetch.data) setApp(refetch.data);
      toast(t("Status updated successfully", "Durum güncellendi"), "success");
      setIsModalOpen(false);
      setStatusNotes("");
    } else {
      toast(res.message || t("Failed to update status", "Durum güncellenemedi"), "error");
    }
    setSavingStatus(false);
  };

  const openReplyModal = () => {
    if (!app) return;
    // Default subject mentions the job title when known so the candidate
    // sees what the message is about before opening it.
    const jobTitle = app.jobTitle ? ` · ${app.jobTitle}` : "";
    setReplySubject(`Öztemur — Başvurunuz hakkında${jobTitle}`);
    setReplyBody("");
    setReplyOpen(true);
  };

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!app) return;
    if (!replySubject.trim() || !replyBody.trim()) {
      toast(t("Subject and message are required.", "Konu ve mesaj zorunludur."), "warning");
      return;
    }
    setSendingReply(true);
    const r = await careersApi.sendApplicationReply(app.id, replySubject, replyBody);
    if (r.success && r.data) {
      if (r.data.deliveryOk) toast(t("Reply sent.", "Cevap gönderildi."), "success");
      else toast(t("Reply saved but email delivery failed. Check SMTP settings.", "Cevap kaydedildi ama mail gönderilemedi. SMTP ayarlarını kontrol edin."), "warning");
      // Prepend reply so admin sees it immediately in the history card,
      // and expand it so the body is visible without an extra click.
      setApp(prev => prev ? { ...prev, replies: [r.data!, ...(prev.replies ?? [])] } : prev);
      setExpandedReplyId(r.data.id);
      setReplyOpen(false);
    } else {
      toast(r.message || t("Send failed.", "Gönderim başarısız."), "error");
    }
    setSendingReply(false);
  };

  if (loading) return <div style={{ padding: 40, color: "var(--outline)", textAlign: "center" }}>{t("Loading application...", "Başvuru yükleniyor...")}</div>;
  if (!app) return <div style={{ padding: 40, color: "var(--error)", textAlign: "center" }}>{t("Application not found.", "Başvuru bulunamadı.")}</div>;

  const currentStatusConfig = statusOptions.find(o => o.value === app.status) || statusOptions[0];
  // Once an application is rejected or hired its outcome is final.
  const isLocked = app.status === ApplicationStatus.Rejected || app.status === ApplicationStatus.Hired;

  return (
    <div style={{ padding: "40px 48px", minHeight: "100vh", background: "var(--surface)" }}>
      {/* Header Section */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/applications" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--outline)", textDecoration: "none", marginBottom: 16 }}>
          <Icon name="arrow_back" style={{ fontSize: 16 }} />
          {t("Back to Applications", "Başvurulara Dön")}
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-headline)", fontSize: 32, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>{app.candidateName}</h1>
            <div style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
              {t("Applied", "Başvuru tarihi")}: {new Date(app.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { month: 'short', day: 'numeric', year: 'numeric' })} • {app.jobTitle || t("Position", "Pozisyon")}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {canEdit && (
              <button onClick={openReplyModal}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--primary)", background: "var(--surface-lowest)", color: "var(--primary)", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <Icon name="mail" style={{ fontSize: 16 }} />
                {t("Reply", "Yanıtla")}
              </button>
            )}
            {isLocked ? (
              <div style={{ padding: "8px 16px", borderRadius: 8, background: "var(--surface-high)", color: "var(--on-surface-variant)", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
                <Icon name="lock" style={{ fontSize: 16 }} />
                {t("Status finalized", "Durum kesinleşti")}
              </div>
            ) : (
              <button onClick={() => { setSelectedStatus(app.status); setIsModalOpen(true); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--on-primary)", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,6,102,0.15)" }}>
                {t("Update Status", "Durumu Güncelle")} <Icon name="expand_more" style={{ fontSize: 18 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Profile Card */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "var(--shadow-soft)" }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: 24, 
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)", 
              color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 36, fontWeight: 800, marginBottom: 20,
              boxShadow: "0 12px 24px -8px rgba(0,6,102,0.4), inset 0 2px 4px rgba(255,255,255,0.2)",
              textShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}>
              {getInitials(app.candidateName)}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>{app.candidateName}</h2>
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: 24 }}>{app.jobTitle || t("Candidate", "Aday")}</p>

            <div style={{ width: "100%", height: 1, background: "var(--surface-high)", marginBottom: 24 }}></div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--on-surface-variant)" }}>
                <Icon name="mail" style={{ fontSize: 18 }} /> {app.email}
              </div>
              {(() => {
                const liHref = safeExternalUrl(app.linkedInUrl);
                if (!liHref) return null;
                let display: string;
                try {
                  const u = new URL(liHref);
                  display = `${u.host}${u.pathname}`.replace(/\/$/, "");
                } catch {
                  display = liHref;
                }
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                    <Icon name="link" style={{ fontSize: 18, color: "var(--on-surface-variant)" }} />
                    <a
                      href={liHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary)", textDecoration: "none", wordBreak: "break-all" }}
                    >
                      {display}
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Application Status Card */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: "var(--outline)", letterSpacing: "0.05em", margin: 0 }}>{t("APPLICATION STATUS", "BAŞVURU DURUMU")}</h3>
              <span style={{ fontSize: 10, fontWeight: 700, background: "var(--primary-fixed)", color: "var(--primary)", padding: "4px 8px", borderRadius: 4 }}>{t("ACTIVE", "AKTİF")}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-low)", padding: "12px 16px", borderRadius: 8, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: currentStatusConfig.color }} className="animate-pulse"></div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{statusLabel(app.status)}</span>
              </div>
              <Icon name="history" style={{ fontSize: 18, color: "var(--outline)" }} />
            </div>

            <h3 style={{ fontSize: 11, fontWeight: 800, color: "var(--outline)", letterSpacing: "0.05em", marginBottom: 16 }}>{t("LOG HISTORY", "İŞLEM GEÇMİŞİ")}</h3>

            {!app.logs || app.logs.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--on-surface-variant)", fontStyle: "italic" }}>{t("No status changes recorded.", "Durum değişikliği kaydı yok.")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, ...(app.logs.length > 5 ? { maxHeight: 340, overflowY: "auto", paddingRight: 8 } : {}) }}>
                {app.logs.map((log) => {
                  return (
                    <div key={log.id} style={{ position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface)" }}>{log.userName}</span>
                        <span style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{new Date(log.logDate).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>
                        {statusLabel(log.fromStatus)} <span style={{ opacity: 0.6, fontWeight: 400 }}>→</span> {statusLabel(log.toStatus)}
                      </p>
                      {log.notes && (
                        <p style={{ fontSize: 12, color: "var(--on-surface-variant)", fontStyle: "italic" }}>"{log.notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sent Replies Card */}
          {app.replies && app.replies.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-soft)" }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: "var(--outline)", letterSpacing: "0.05em", marginBottom: 16 }}>
                {t("SENT REPLIES", "GÖNDERİLEN YANITLAR")} ({app.replies.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, ...(app.replies.length > 5 ? { maxHeight: 420, overflowY: "auto", paddingRight: 8 } : {}) }}>
                {app.replies.map(r => {
                  const open = expandedReplyId === r.id;
                  return (
                    <div key={r.id} style={{ background: "var(--surface-low)", borderRadius: 8, border: "1px solid var(--surface-high)", overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setExpandedReplyId(open ? null : r.id)}
                        style={{ display: "grid", gridTemplateColumns: "1fr auto 16px", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: open ? "var(--surface)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .15s" }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 9999, background: r.deliveryOk ? "rgba(46,125,50,0.1)" : "rgba(179,38,30,0.1)", color: r.deliveryOk ? "var(--success, #2e7d32)" : "var(--error)" }}>
                          {r.deliveryOk ? t("Delivered", "İletildi") : t("Failed", "Başarısız")}
                        </span>
                        <Icon name="expand_more" style={{ fontSize: 16, color: "var(--outline)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                      </button>
                      {open && (
                        <div style={{ padding: "10px 14px 12px" }}>
                          <div style={{ fontSize: 12, color: "var(--on-surface-variant)", whiteSpace: "pre-line", lineHeight: 1.55, marginBottom: 10 }}>{r.body}</div>
                          <div style={{ fontSize: 10, color: "var(--outline)" }}>
                            {r.sentBy || t("System", "Sistem")} · {new Date(r.sentAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Executive Summary */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, boxShadow: "var(--shadow-soft)" }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, color: "var(--outline)", letterSpacing: "0.05em", marginBottom: 16 }}>{t("EXECUTIVE SUMMARY", "ÖZ GEÇMİŞ ÖZETİ")}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--on-surface-variant)", whiteSpace: "pre-wrap" }}>
              {app.executiveSummary || <span style={{ fontStyle: "italic", opacity: 0.6 }}>{t("No summary provided.", "Özet belirtilmemiş.")}</span>}
            </p>
          </div>

          {/* Curriculum Vitae */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, flex: 1, boxShadow: "var(--shadow-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: "var(--outline)", letterSpacing: "0.05em" }}>{t("CURRICULUM VITAE", "ÖZGEÇMİŞ (CV)")}</h3>
              <div style={{ display: "flex", gap: 16 }}>
                {cvBlobUrl ? (
                  <a href={cvBlobUrl} download style={{ color: "var(--outline)", textDecoration: "none", display: "flex" }}>
                    <Icon name="download" style={{ fontSize: 20 }} />
                  </a>
                ) : (
                  <Icon name="download" style={{ fontSize: 20, color: "var(--outline)" }} />
                )}
                {cvBlobUrl ? (
                  <a href={cvBlobUrl} target="_blank" rel="noreferrer" style={{ color: "var(--outline)", textDecoration: "none", display: "flex" }}>
                    <Icon name="open_in_full" style={{ fontSize: 20 }} />
                  </a>
                ) : (
                  <Icon name="open_in_full" style={{ fontSize: 20, color: "var(--outline)" }} />
                )}
              </div>
            </div>

            {/* CV Preview Placeholder matching design */}
            <div style={{ background: "var(--surface-low)", borderRadius: 8, padding: 48, minHeight: 500, display: "flex", justifyContent: "center", alignItems: "center" }}>
              {cvBlobUrl ? (
                <iframe src={`${cvBlobUrl}#toolbar=0`} style={{ width: "100%", height: "100%", minHeight: 600, border: "none", background: "#fff", borderRadius: 8 }} title="CV Preview" />
              ) : (
                <div style={{ width: "100%", maxWidth: 400, background: "#fff", padding: 32, borderRadius: 4, boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ width: "40%", height: 16, background: "var(--surface-high)", borderRadius: 4, marginBottom: 24 }}></div>
                  <div style={{ width: "30%", height: 10, background: "var(--surface-high)", borderRadius: 4, marginBottom: 8 }}></div>
                  <div style={{ width: "80%", height: 10, background: "var(--surface-high)", borderRadius: 4, marginBottom: 8 }}></div>
                  <div style={{ width: "70%", height: 10, background: "var(--surface-high)", borderRadius: 4, marginBottom: 24 }}></div>

                  <div style={{ width: "25%", height: 10, background: "var(--surface-high)", borderRadius: 4, marginBottom: 8 }}></div>
                  <div style={{ width: "85%", height: 10, background: "var(--surface-high)", borderRadius: 4, marginBottom: 8 }}></div>
                  <div style={{ width: "75%", height: 10, background: "var(--surface-high)", borderRadius: 4, marginBottom: 8 }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY: Update Status */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(25, 28, 30, 0.4)", backdropFilter: "blur(2px)" }} onClick={() => !savingStatus && setIsModalOpen(false)}></div>

          <div style={{
            position: "relative", width: "100%", maxWidth: 520, maxHeight: "90vh", background: "#ffffff",
            borderRadius: 16, boxShadow: "0 24px 48px -12px rgba(25,28,30,0.15)", display: "flex", flexDirection: "column", margin: 16,
            overflow: "hidden"
          }} className="animate-fadeIn">

            {/* Header */}
            <div style={{ padding: "32px 32px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 22, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>{t("Update Application Status", "Başvuru Durumunu Güncelle")}</h2>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 6 }}>{t(`Change the progression state for ${app.candidateName}.`, `${app.candidateName} için süreç durumunu değiştirin.`)}</p>
              </div>
              <button onClick={() => !savingStatus && setIsModalOpen(false)} style={{ background: "var(--surface-low)", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)", cursor: "pointer" }}>
                <Icon name="close" style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 32px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", flex: 1 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--on-surface)", marginBottom: 12 }}>{t("New Status", "Yeni Durum")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {statusOptions.map(opt => {
                    const isSelected = selectedStatus === opt.value;
                    return (
                      <label key={opt.value} style={{ cursor: "pointer" }}>
                        <input type="radio" name="status" value={opt.value} checked={isSelected} onChange={() => setSelectedStatus(opt.value)} style={{ display: "none" }} />
                        <span style={{
                          display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 600,
                          background: isSelected ? "var(--primary)" : "var(--surface-high)",
                          color: isSelected ? "var(--on-primary)" : "var(--on-surface-variant)",
                          transition: "all 0.2s"
                        }}>
                          {statusLabel(opt.value)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--on-surface)", marginBottom: 8 }}>
                  {t("Note", "Not")} <span style={{ color: "var(--outline-variant)", fontWeight: 400 }}>({t("Optional", "İsteğe bağlı")})</span>
                </label>
                <textarea
                  value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder={t("Add internal context for this status change...", "Bu durum değişikliği için iç not ekleyin...")} rows={4}
                  style={{
                    width: "100%", background: "#fff", borderRadius: 8, border: "1px solid var(--outline-variant)",
                    padding: "12px 16px", fontSize: 13, color: "var(--on-surface)", outline: "none", resize: "none",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                  }}
                  className="focus-ring"
                />
                <p style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 8 }}>{t("This note will be visible to all hiring team members.", "Bu not tüm işe alım ekibi üyelerine görünür olacak.")}</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: "16px 32px 32px", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
              <button onClick={() => !savingStatus && setIsModalOpen(false)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "var(--on-surface-variant)", background: "transparent", border: "none", cursor: "pointer" }}>
                {t("Cancel", "Vazgeç")}
              </button>
              <button onClick={handleSaveStatus} disabled={savingStatus} style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "var(--primary)",
                color: "var(--on-primary)", border: "none", cursor: savingStatus ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,6,102,0.15)"
              }}>
                {savingStatus ? t("Updating...", "Güncelleniyor...") : t("Update Status", "Durumu Güncelle")}
                {!savingStatus && <Icon name="check" style={{ fontSize: 18 }} />}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MODAL OVERLAY: Send reply */}
      {replyOpen && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(25, 28, 30, 0.4)", backdropFilter: "blur(2px)" }} onClick={() => !sendingReply && setReplyOpen(false)}></div>

          <form onSubmit={submitReply} style={{
            position: "relative", width: "100%", maxWidth: 580, maxHeight: "90vh", background: "#ffffff",
            borderRadius: 16, boxShadow: "0 24px 48px -12px rgba(25,28,30,0.15)", display: "flex", flexDirection: "column", margin: 16, overflow: "hidden"
          }} className="animate-fadeIn">
            <div style={{ padding: "32px 32px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 22, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em" }}>{t("Reply to", "Yanıtla")}: {app.candidateName}</h2>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.email}</p>
              </div>
              <button type="button" onClick={() => !sendingReply && setReplyOpen(false)} style={{ background: "var(--surface-low)", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-surface-variant)", cursor: "pointer" }}>
                <Icon name="close" style={{ fontSize: 18 }} />
              </button>
            </div>

            <div style={{ padding: "16px 32px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--on-surface)", marginBottom: 8 }}>{t("Subject", "Konu")} *</label>
                <input type="text" value={replySubject} onChange={e => setReplySubject(e.target.value)} disabled={sendingReply}
                  style={{ width: "100%", background: "#fff", borderRadius: 8, border: "1px solid var(--outline-variant)", padding: "10px 14px", fontSize: 14, color: "var(--on-surface)", outline: "none" }}
                  className="focus-ring" />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--on-surface)", marginBottom: 8 }}>{t("Message", "Mesaj")} *</label>
                <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} disabled={sendingReply} rows={9} autoFocus
                  placeholder={t("e.g. We would like to invite you for an interview…", "ör. Sizi mülakata davet etmek istiyoruz…")}
                  style={{ width: "100%", background: "#fff", borderRadius: 8, border: "1px solid var(--outline-variant)", padding: "12px 16px", fontSize: 14, color: "var(--on-surface)", outline: "none", resize: "vertical", minHeight: 180, fontFamily: "inherit", lineHeight: 1.5 }}
                  className="focus-ring" />
                <p style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 8 }}>
                  {t("Blank lines split paragraphs. The email is plain text — HTML is not parsed.", "Boş satır paragraf ayırır. E-posta düz metin gider — HTML işlenmez.")}
                </p>
              </div>
            </div>

            <div style={{ padding: "16px 32px 32px", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
              <button type="button" onClick={() => !sendingReply && setReplyOpen(false)}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "var(--on-surface-variant)", background: "transparent", border: "none", cursor: "pointer" }}>
                {t("Cancel", "Vazgeç")}
              </button>
              <button type="submit" disabled={sendingReply}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "var(--primary)", color: "var(--on-primary)", border: "none", cursor: sendingReply ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,6,102,0.15)" }}>
                {sendingReply ? t("Sending…", "Gönderiliyor…") : t("Send", "Gönder")}
                {!sendingReply && <Icon name="arrow_outward" style={{ fontSize: 16 }} />}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .focus-ring:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--primary-fixed) !important; }
        * { box-sizing: border-box; }
      `}} />
    </div>
  );
}
