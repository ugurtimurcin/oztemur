import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent, pickSection } from "@/lib/server/siteContent";
import LegalPage from "@/components/LegalPage";

const FALLBACK: Record<string, { title: string; lastUpdated: string; content: string }> = {
  tr: {
    title: "Gizlilik Politikası",
    lastUpdated: "Son güncelleme: Mayıs 2026",
    content: "Gizlilik politikamız yükleniyor.",
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: May 2026",
    content: "Our privacy policy is loading.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const f = FALLBACK[locale] ?? FALLBACK.en;
  return buildMetadata({ title: f.title, description: f.title, path: "/privacy" }, locale);
}

export default async function Page() {
  const locale = await resolveLocale();
  const page = await getPageContent("privacy", locale);
  const c = pickSection(page, "main", FALLBACK[locale] ?? FALLBACK.en);
  return <LegalPage title={c.title} lastUpdated={c.lastUpdated} content={c.content} />;
}
