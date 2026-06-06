import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import NewsView from "./NewsView";

const TITLES: Record<string, string> = { tr: "Haberler", en: "Newsroom" };
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies'den haberler — şirketlerimizden, yatırımlarımızdan ve sektörel gelişmelerden seçtiklerimiz.",
  en: "News from Öztemur Group Of Companies — selected updates from across our companies, investments and sectors.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("news", locale);
  const description =
    page.hero?.lead && page.hero.lead.length > 0 ? page.hero.lead : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    { title: TITLES[locale] ?? TITLES.en, description, path: "/news" },
    locale,
  );
}

export default function Page() {
  return <NewsView />;
}
