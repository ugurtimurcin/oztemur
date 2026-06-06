import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import AboutView from "./AboutView";

const TITLES: Record<string, string> = {
  tr: "Hakkımızda",
  en: "About",
};
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies; inşaat, gayrimenkul, enerji, lojistik ve ticaret alanlarında faaliyet gösteren çok sektörlü bir aile şirketler grubudur.",
  en: "Öztemur Group Of Companies is a multi-sector family-owned group operating across construction, real estate, energy, logistics and trade.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("about", locale);
  // Prefer admin-edited heroLead; fall back to static description.
  const description =
    page.hero?.heroLead && page.hero.heroLead.length > 0
      ? page.hero.heroLead
      : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  return buildMetadata(
    {
      title: TITLES[locale] ?? TITLES.en,
      description,
      path: "/about",
    },
    locale,
  );
}

export default function Page() {
  return <AboutView />;
}
