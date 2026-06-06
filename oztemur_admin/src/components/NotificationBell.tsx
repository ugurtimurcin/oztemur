"use client";
/* ═══════════════════════════════════════════════
   NotificationBell — top-bar bell + dropdown feed
   Polls the unread count; loads the list on open.
   ═══════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notificationsApi, type NotificationDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const POLL_MS = 45_000;
const PAGE_SIZE = 20;

function iconFor(type: string): string {
  switch (type) {
    case "contact_message": return "mail";
    case "job_application": return "assignment_ind";
    default:                return "notifications";
  }
}

function relativeTime(iso: string, tr: boolean): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return tr ? "az önce" : "just now";
  if (min < 60) return tr ? `${min} dk önce` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return tr ? `${hr} sa önce` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return tr ? `${day} gün önce` : `${day}d ago`;
  return new Date(iso).toLocaleDateString(tr ? "tr-TR" : "en-GB", { day: "2-digit", month: "short" });
}

export default function NotificationBell() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    const r = await notificationsApi.unreadCount();
    if (r.success && typeof r.data === "number") setUnread(r.data);
  }, []);

  // Initial load — replaces the list.
  const loadFirst = useCallback(async () => {
    setLoading(true);
    const r = await notificationsApi.list(1, PAGE_SIZE);
    if (r.success && r.data) {
      setItems(r.data.items);
      setTotal(r.data.totalCount);
      setUnread(r.data.unreadCount);
      setPage(1);
    }
    setLoading(false);
  }, []);

  // Append the next page when the user clicks "Show more".
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const next = page + 1;
    const r = await notificationsApi.list(next, PAGE_SIZE);
    if (r.success && r.data) {
      setItems(prev => [...prev, ...r.data!.items]);
      setTotal(r.data.totalCount);
      setUnread(r.data.unreadCount);
      setPage(next);
    }
    setLoadingMore(false);
  }, [page]);

  // Poll the badge count.
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  // Reload the feed from page 1 each time the panel opens.
  useEffect(() => {
    if (open) loadFirst();
  }, [open, loadFirst]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleItemClick = async (n: NotificationDto) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id);
      setItems(prev => prev.map(i => (i.id === n.id ? { ...i, isRead: true } : i)));
      setUnread(c => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead();
    setItems(prev => prev.map(i => ({ ...i, isRead: true })));
    setUnread(0);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={t("Notifications", "Bildirimler")}
        style={{ position: "relative", padding: 6, cursor: "pointer", background: "none", border: "none", color: "var(--on-surface-variant)", display: "flex" }}
      >
        <Icon name="notifications" style={{ fontSize: 22 }} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, padding: "0 4px",
            borderRadius: 9999, background: "var(--error)", color: "#fff",
            fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0, width: 360,
          background: "var(--surface-lowest)", borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
          border: "1px solid rgba(198,197,212,0.25)", overflow: "hidden", zIndex: 50,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(198,197,212,0.2)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--on-surface)" }}>
              {t("Notifications", "Bildirimler")}{unread > 0 && <span style={{ color: "var(--outline)", fontWeight: 500 }}> · {unread} {t("new", "yeni")}</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--primary)" }}
              >
                {t("Mark all read", "Tümünü okundu işaretle")}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite" }} />
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--outline)" }}>
                <Icon name="notifications_off" style={{ fontSize: 32, opacity: 0.35, display: "block", marginInline: "auto", marginBottom: 6 }} />
                <p style={{ fontSize: 13, fontWeight: 500 }}>{t("No notifications yet.", "Henüz bildirim yok.")}</p>
              </div>
            ) : (
              <>
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "12px 16px",
                      border: "none", borderBottom: "1px solid rgba(198,197,212,0.12)", cursor: "pointer",
                      background: n.isRead ? "transparent" : "var(--primary-fixed)",
                      transition: "background .15s",
                    }}
                  >
                    <Icon name={iconFor(n.type)} style={{ fontSize: 20, color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: "var(--on-surface)" }}>{n.title}</span>
                        {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                        {n.message}
                      </span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--outline)", marginTop: 3 }}>
                        {relativeTime(n.createdAt, locale === "tr")}
                      </span>
                    </span>
                  </button>
                ))}
                {items.length < total && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      width: "100%", padding: "12px 16px", border: "none",
                      background: "var(--surface)", cursor: loadingMore ? "wait" : "pointer",
                      fontSize: 12, fontWeight: 600, color: "var(--primary)",
                    }}
                  >
                    {loadingMore ? (
                      <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--primary-fixed)", borderTopColor: "var(--primary)", animation: "spin .8s linear infinite", display: "inline-block" }} />
                    ) : (
                      <>
                        {t("Show more", "Daha fazla göster")}
                        <span style={{ color: "var(--outline)", fontWeight: 500 }}>· {total - items.length}</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
