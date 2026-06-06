import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import CareersView from "./CareersView";

const TITLES: Record<string, string> = { tr: "Kariyer", en: "Careers" };
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies'de kariyer fırsatları. İşine sahip çıkan, uzun vadeli düşünen ve kaliteden ödün vermeyen ekipler kuruyoruz.",
  en: "Career opportunities at Öztemur Group Of Companies. We build teams that take ownership, think long-term and refuse to compromise on quality.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("careers", locale);
  const description =
    page.hero?.lead && page.hero.lead.length > 0 ? page.hero.lead : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    { title: TITLES[locale] ?? TITLES.en, description, path: "/careers" },
    locale,
  );
}

export default function Page() {
  return <CareersView />;
}
