"use client";
import AdminShell from "@/components/AdminShell";
import { ToastProvider } from "@/components/Toast";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/AuthContext";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <ToastProvider>
            <AdminShell>{children}</AdminShell>
          </ToastProvider>
        </ConfirmDialogProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
