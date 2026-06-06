import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import CompaniesView from "./CompaniesView";

const TITLES: Record<string, string> = { tr: "Şirketler", en: "Companies" };
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies bünyesindeki çok sektörlü grup şirketleri. Birbirini tamamlayan sektörlerde ortak bir disiplinle yönetilen markalarımız.",
  en: "The multi-sector group companies of Öztemur Group Of Companies — brands operating across complementary sectors with shared discipline.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("companies", locale);
  const description =
    page.hero?.lead && page.hero.lead.length > 0 ? page.hero.lead : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    { title: TITLES[locale] ?? TITLES.en, description, path: "/companies" },
    locale,
  );
}

export default function Page() {
  return <CompaniesView />;
}
