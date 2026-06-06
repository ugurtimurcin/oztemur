"use client";
import AdminShell from "@/components/AdminShell";
import { ToastProvider } from "@/components/Toast";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { I18nProvider } from "@/lib/i18n";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ConfirmDialogProvider>
        <ToastProvider>
          <AdminShell>{children}</AdminShell>
        </ToastProvider>
      </ConfirmDialogProvider>
    </I18nProvider>
  );
}
