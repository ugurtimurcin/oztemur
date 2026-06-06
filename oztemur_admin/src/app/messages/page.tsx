"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Pagination from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { commsApi, hasPermission, type ContactMessageDto, type MessageReplyDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const PAGE_SIZE = 25;

export default function MessagesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t, locale } = useI18n();
  const canEdit = hasPermission("messages.edit");
  const canDelete = hasPermission("messages.delete");
  const [data, setData] = useState<ContactMessageDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Per-message reply history, keyed by message id. Loaded lazily on expand.
  const [replies, setReplies] = useState<Record<string, MessageReplyDto[]>>({});
  // Which reply body is currently expanded. Single-selection across all
  // messages — a long reply shouldn't blow up the list.
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);

  // Reply modal state
  const [replyOpen, setReplyOpen] = useState<ContactMessageDto | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const r = await commsApi.getMessages(p, PAGE_SIZE);
    if (r.success && r.data) {
      setData(r.data.items);
      setTotalCount(r.data.totalCount);
      setTotalPages(Math.max(1, Math.ceil(r.data.totalCount / r.data.pageSize)));
    } else setError(r.message || t("Failed to load.", "Yüklenemedi."));
    setLoading(false);
  }, [t]);

  useEffect(() => { load(page); }, [load, page]);

  // Open a message → mark it read and fetch reply history (cached after the
  // first open so collapsing doesn't refetch).
  const toggle = (m: ContactMessageDto) => {
    const opening = expandedId !== m.id;
    setExpandedId(opening ? m.id : null);
    if (opening) {
      if (!m.isRead && canEdit) {
        commsApi.markAsRead(m.id).then(r => {
          if (r.success) setData(prev => prev.map(x => (x.id === m.id ? { ...x, isRead: true } : x)));
        });
      }
      if (!replies[m.id]) {
        commsApi.getMessage(m.id).then(r => {
          if (r.success && r.data) {
            setReplies(prev => ({ ...prev, [m.id]: r.data!.replies }));
            // Default the newest reply open so admin sees the most recent
            // body without an extra click.
            if (r.data.replies.length > 0) setExpandedReplyId(r.data.replies[0].id);
          }
        });
      }
    }
  };

  const remove = async (m: ContactMessageDto) => {
    const ok = await confirm({
      title: t("Delete Message", "Mesajı Sil"),
      description: t("Delete this message? This action cannot be undone.", "Bu mesaj silinsin mi? Bu işlem geri alınamaz."),
      confirmLabel: t("Delete", "Sil"),
      variant: "danger",
    });
    if (!ok) return;
    const r = await commsApi.deleteMessage(m.id);
    if (r.success) { toast(t("Message deleted.", "Mesaj silindi."), "success"); load(page); }
    else toast(r.message || t("Failed to delete message.", "Mesaj silinemedi."), "error");
  };

  const openReply = (m: ContactMessageDto) => {
    // Common email etiquette — prefix "Re:" once, not "Re: Re: Re:" if admin
    // is replying to a message whose subject was itself a reply.
    const re = m.subject.toLowerCase().startsWith("re:") ? m.subject : `Re: ${m.subject}`;
    setReplySubject(re);
    setReplyBody("");
    setReplyOpen(m);
  };

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyOpen) return;
    if (!replySubject.trim() || !replyBody.trim()) {
      toast(t("Subject and message are required.", "Konu ve mesaj zorunludur."), "warning");
      return;
    }
    setSending(true);
    const r = await commsApi.sendReply(replyOpen.id, replySubject, replyBody);
    if (r.success && r.data) {
      // Show the right toast based on whether SMTP actually delivered.
      if (r.data.deliveryOk) toast(t("Reply sent.", "Cevap gönderildi."), "success");
      else toast(t("Reply saved but email delivery failed. Check SMTP settings.", "Cevap kaydedildi ama mail gönderilemedi. SMTP ayarlarını kontrol edin."), "warning");
      // Prepend to history (cached array) so admin sees it instantly,
      // and auto-expand it so the body is visible.
      setReplies(prev => ({ ...prev, [replyOpen.id]: [r.data!, ...(prev[replyOpen.id] ?? [])] }));
      setExpandedReplyId(r.data.id);
      setReplyOpen(null);
    } else {
      toast(r.message || t("Send failed.", "Gönderim başarısız."), "error");
    }
    setSending(false);
  };

  const fmtShort = (iso: string) => new Date(iso).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric" });
  const fmtFull = (iso: string) => new Date(iso).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Inbox", "Gelen Kutusu")}</h1>
        <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>{t("Incoming contact form messages and inquiries.", "İletişim formundan gelen mesajlar ve talepler.")}</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", background: "var(--surface-lowest)", borderRadius: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "64px 0", background: "var(--surface-lowest)", borderRadius: 8 }}>
          <Icon name="cloud_off" style={{ fontSize: 36, color: "var(--error)", display: "block", marginInline: "auto", marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--error)" }}>{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", background: "var(--surface-lowest)", borderRadius: 8 }}>
          <Icon name="mail" style={{ fontSize: 40, color: "var(--outline-variant)", display: "block", marginInline: "auto", marginBottom: 12 }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--outline)" }}>{t("No messages yet.", "Henüz mesaj yok.")}</p>
        </div>
      ) : (
        <div style={{ background: "var(--surface-lowest)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-soft)" }}>
          {data.map((m, i) => {
            const open = expandedId === m.id;
            const messageReplies = replies[m.id] ?? [];
            return (
              <div key={m.id} style={{ borderTop: i ? "1px solid rgba(198,197,212,0.12)" : "none" }}>
                {/* Row header */}
                <button
                  onClick={() => toggle(m)}
                  style={{
                    display: "grid", gridTemplateColumns: "20px minmax(0,1.4fr) minmax(0,2fr) 70px 110px 24px",
                    alignItems: "center", gap: 14, width: "100%", padding: "14px 20px",
                    background: open ? "var(--surface)" : "transparent", border: "none",
                    cursor: "pointer", textAlign: "left", transition: "background .15s",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.isRead ? "transparent" : "var(--primary)", justifySelf: "center" }} />
                  <span style={{ fontSize: 14, fontWeight: m.isRead ? 500 : 700, color: m.isRead ? "var(--on-surface-variant)" : "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                  <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontWeight: m.isRead ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</span>
                  <span>
                    {!m.isRead && <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.04em" }}>{t("NEW", "YENİ")}</span>}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--outline)" }}>{fmtShort(m.createdAt)}</span>
                  <Icon name="expand_more" style={{ fontSize: 18, color: "var(--outline)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", justifySelf: "end" }} />
                </button>

                {/* Expanded detail */}
                {open && (
                  <div style={{ padding: "4px 20px 22px 54px" }}>
                    {/* Sender + meta */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                        <span style={{ color: "var(--outline)" }}>{t("From", "Gönderen")}: </span>
                        <strong style={{ color: "var(--on-surface)" }}>{m.name}</strong>
                        {" · "}
                        <a href={`mailto:${m.email}`} style={{ color: "var(--primary)", textDecoration: "none" }}>{m.email}</a>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--outline)" }}>{fmtFull(m.createdAt)}</span>
                    </div>

                    {/* Message body */}
                    <div style={{ background: "var(--surface)", borderRadius: 8, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, color: "var(--on-surface)", whiteSpace: "pre-line" }}>
                      {m.message?.trim() || <em style={{ color: "var(--outline-variant)" }}>{t("(empty message)", "(boş mesaj)")}</em>}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      {canEdit && (
                        <button
                          onClick={() => openReply(m)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer" }}
                        >
                          <Icon name="mail" style={{ fontSize: 16 }} />
                          {t("Reply", "Yanıtla")}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => remove(m)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--error)", background: "var(--error-container)", border: "none", cursor: "pointer" }}
                        >
                          <Icon name="delete" style={{ fontSize: 16 }} />
                          {t("Delete", "Sil")}
                        </button>
                      )}
                    </div>

                    {/* Reply history */}
                    {messageReplies.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 10 }}>
                          {t("Sent replies", "Gönderilen yanıtlar")} ({messageReplies.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {messageReplies.map(r => {
                            const replyOpen = expandedReplyId === r.id;
                            return (
                              <div key={r.id} style={{ background: "var(--surface-lowest)", border: "1px solid rgba(198,197,212,0.2)", borderRadius: 8, overflow: "hidden" }}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedReplyId(replyOpen ? null : r.id)}
                                  style={{ display: "grid", gridTemplateColumns: "1fr auto 18px", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", background: replyOpen ? "var(--surface)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .15s" }}
                                >
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 9999, background: r.deliveryOk ? "rgba(46,125,50,0.1)" : "rgba(179,38,30,0.1)", color: r.deliveryOk ? "var(--success, #2e7d32)" : "var(--error)" }}>
                                    {r.deliveryOk ? t("Delivered", "İletildi") : t("Failed", "Başarısız")}
                                  </span>
                                  <Icon name="expand_more" style={{ fontSize: 18, color: "var(--outline)", transform: replyOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                                </button>
                                {replyOpen && (
                                  <div style={{ padding: "8px 14px 12px" }}>
                                    <div style={{ fontSize: 13, color: "var(--on-surface-variant)", whiteSpace: "pre-line", lineHeight: 1.55, marginBottom: 10 }}>{r.body}</div>
                                    <div style={{ fontSize: 11, color: "var(--outline)" }}>
                                      {r.sentBy || t("System", "Sistem")} · {fmtFull(r.sentAt)}
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
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />

      {/* ─── Reply modal ──────────────────────────── */}
      {replyOpen && (
        <div
          onClick={() => !sending && setReplyOpen(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,26,47,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={submitReply}
            style={{ background: "var(--surface-lowest)", borderRadius: 12, padding: "28px 32px", boxShadow: "0 24px 60px rgba(10,26,47,0.25)", width: "100%", maxWidth: 560 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(0,6,102,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="mail" style={{ fontSize: 20, color: "var(--primary)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>{t("Reply to", "Yanıtla")}: {replyOpen.name}</h3>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyOpen.email}</p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 }}>{t("Subject", "Konu")} *</label>
              <input
                value={replySubject}
                onChange={e => setReplySubject(e.target.value)}
                disabled={sending}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--outline)", marginBottom: 6 }}>{t("Message", "Mesaj")} *</label>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                disabled={sending}
                rows={8}
                autoFocus
                placeholder={t("Type your reply…", "Yanıtınızı yazın…")}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface)", color: "var(--on-surface)", border: "1px solid rgba(198,197,212,0.3)", outline: "none", resize: "vertical", minHeight: 160, fontFamily: "inherit", lineHeight: 1.5 }}
              />
              <p style={{ fontSize: 11, color: "var(--outline-variant)", marginTop: 4 }}>
                {t("Blank lines split paragraphs. The email is plain text — HTML is not parsed.", "Boş satır paragraf ayırır. E-posta düz metin gider — HTML işlenmez.")}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setReplyOpen(null)} disabled={sending}
                style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", background: "var(--surface)", border: "1px solid rgba(198,197,212,0.3)", cursor: sending ? "not-allowed" : "pointer" }}>
                {t("Cancel", "Vazgeç")}
              </button>
              <button type="submit" disabled={sending}
                style={{ padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: sending ? 0.6 : 1 }}>
                {sending
                  ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />{t("Sending…", "Gönderiliyor…")}</>)
                  : (<><Icon name="arrow_outward" style={{ fontSize: 16 }} />{t("Send", "Gönder")}</>)}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
