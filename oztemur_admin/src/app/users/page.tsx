"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/DataTable";
import Pagination from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { usersApi, hasPermission, type ManagedUserDto } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Icon from "@/components/Icon";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { t, locale } = useI18n();
  const [data, setData] = useState<ManagedUserDto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = hasPermission("users.edit");
  const canDelete = hasPermission("users.delete");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await usersApi.list();
    if (r.success && r.data) setData(r.data);
    else setError(r.message || t("Failed to load users.", "Kullanıcılar yüklenemedi."));
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // Endpoint returns all users in one call; paginate on the client.
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  // Keep the current page in range when the underlying list shrinks (delete).
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{t("Users & Access", "Kullanıcılar ve Yetkiler")}</h1>
          <p style={{ fontSize: 14, color: "var(--on-surface-variant)", marginTop: 4 }}>{t("Manage admin accounts and what each one can do.", "Yönetici hesaplarını ve her birinin neler yapabileceğini yönetin.")}</p>
        </div>
        {canEdit && (
          <button onClick={() => router.push("/users/new")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, var(--primary), var(--primary-container))", border: "none", cursor: "pointer" }}>
            <Icon name="person_add" style={{ fontSize: 18 }} />{t("Add User", "Kullanıcı Ekle")}
          </button>
        )}
      </div>

      <DataTable
        columns={[
          { key: "name", label: t("Name", "Ad Soyad"), render: u => (
            <span style={{ fontWeight: 600, color: "var(--on-surface)" }}>{u.firstName} {u.lastName}</span>
          )},
          { key: "email", label: t("Email", "E-posta"), render: u => <span style={{ color: "var(--on-surface-variant)" }}>{u.email}</span> },
          { key: "permissions", label: t("Access", "Erişim"), width: "140px", render: u => (
            <span style={{ fontSize: 12, color: "var(--outline)" }}>
              {u.permissions.length === 0
                ? t("No access", "Erişim yok")
                : t(`${u.permissions.length} permission${u.permissions.length === 1 ? "" : "s"}`, `${u.permissions.length} izin`)}
            </span>
          )},
          { key: "isActive", label: t("Status", "Durum"), width: "110px", render: u => (
            <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
              background: u.isActive ? "var(--success-container)" : "var(--error-container)",
              color: u.isActive ? "var(--success)" : "var(--error)" }}>
              {u.isActive ? t("Active", "Aktif") : t("Disabled", "Devre Dışı")}
            </span>
          )},
          { key: "lastLoginAt", label: t("Last Login", "Son Giriş"), width: "130px", render: u => (
            <span style={{ fontSize: 12, color: "var(--outline)" }}>
              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </span>
          )},
        ]}
        data={pageRows}
        loading={loading}
        error={error}
        getRowId={u => u.id}
        onRowClick={canEdit ? (u => router.push(`/users/${u.id}`)) : undefined}
        onEdit={canEdit ? (id => router.push(`/users/${id}`)) : undefined}
        onDelete={canDelete ? (async id => {
          const ok = await confirm({
            title: t("Delete User", "Kullanıcıyı Sil"),
            description: t(
              "This permanently removes the account. The person will no longer be able to sign in.",
              "Bu işlem hesabı kalıcı olarak siler. Kişi artık giriş yapamayacak."),
            confirmLabel: t("Delete", "Sil"),
            variant: "danger",
          });
          if (!ok) return;
          const r = await usersApi.remove(id);
          if (r.success) { toast(t("User deleted.", "Kullanıcı silindi."), "success"); load(); }
          else toast(r.message || t("Failed to delete user.", "Kullanıcı silinemedi."), "error");
        }) : undefined}
        emptyIcon="group" emptyMessage={t("No users yet.", "Henüz kullanıcı yok.")}
      />
      <Pagination page={page} totalPages={totalPages} totalCount={data.length} onPageChange={setPage} />
    </div>
  );
}
