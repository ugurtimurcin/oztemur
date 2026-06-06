import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import ProjectsView from "./ProjectsView";

const TITLES: Record<string, string> = { tr: "Projeler", en: "Projects" };
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies tarafından tasarlanan ve hayata geçirilen, yarınlara değer üreten projeler.",
  en: "Projects designed and delivered by Öztemur Group Of Companies — work that creates durable value for tomorrow.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("projects", locale);
  const description =
    page.hero?.lead && page.hero.lead.length > 0 ? page.hero.lead : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    { title: TITLES[locale] ?? TITLES.en, description, path: "/projects" },
    locale,
  );
}

export default function Page() {
  return <ProjectsView />;
}
