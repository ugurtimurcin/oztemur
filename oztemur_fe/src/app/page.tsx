import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent } from "@/lib/server/siteContent";
import HomeView from "./HomeView";

const TITLES: Record<string, string> = {
  tr: "Öztemur Group Of Companies | Nesilden nesile güven",
  en: "Öztemur Group Of Companies | Building generations of trust",
};
const DESCRIPTIONS: Record<string, string> = {
  tr: "Öztemur Group Of Companies — inşaat, gayrimenkul, enerji, lojistik ve ticaret alanlarında faaliyet gösteren çok sektörlü bir şirketler ailesi.",
  en: "Öztemur Group Of Companies — a multi-sector family of companies operating across construction, real estate, energy, logistics and trade.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const page = await getPageContent("home", locale);
  const description =
    page.hero?.body && page.hero.body.length > 0 ? page.hero.body : DESCRIPTIONS[locale] ?? DESCRIPTIONS.en;
  // Home page wants the standalone brand title (no "| Öztemur Group Of Companies" suffix
  // doubled by the layout template), so we use Metadata.title.absolute.
  return {
    ...(await buildMetadata({ title: TITLES[locale] ?? TITLES.en, description, path: "/" }, locale)),
    title: { absolute: TITLES[locale] ?? TITLES.en },
  };
}

export default function Page() {
  return <HomeView />;
}
