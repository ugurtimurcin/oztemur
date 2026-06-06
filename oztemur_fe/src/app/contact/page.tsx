import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import ContactView from "./ContactView";

const TITLES: Record<string, string> = { tr: "İletişim", en: "Contact" };
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies ile iletişime geçin — bir iş, ortaklık ya da soru için doğrudan ilgili departmana ulaşın.",
  en: "Get in touch with Öztemur Group Of Companies — reach the right department directly for a project, partnership or question.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("contact", locale);
  const description =
    page.hero?.lead && page.hero.lead.length > 0 ? page.hero.lead : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    { title: TITLES[locale] ?? TITLES.en, description, path: "/contact" },
    locale,
  );
}

export default function Page() {
  return <ContactView />;
}
