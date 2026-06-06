import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import BlogView from "./BlogView";

const TITLES: Record<string, string> = { tr: "İçgörüler", en: "Insights" };
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies'in sektörlerine, yatırım yaklaşımına ve kurumsal felsefesine dair derinlikli yazılar.",
  en: "Long-form writing from Öztemur Group Of Companies on our sectors, investment approach and corporate philosophy.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("blog", locale);
  const description =
    page.hero?.lead && page.hero.lead.length > 0 ? page.hero.lead : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    { title: TITLES[locale] ?? TITLES.en, description, path: "/blog" },
    locale,
  );
}

export default function Page() {
  return <BlogView />;
}
