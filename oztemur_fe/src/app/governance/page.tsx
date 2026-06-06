import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent, getUiStrings, pickSection } from "@/lib/server/siteContent";
import Header from "@/components/Header";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Kurumsal yönetim",
    line1: "Şeffaflık,",
    line2: "hesap verebilirlik.",
    lead: "Öztemur Group Of Companies, grup şirketlerinde ortak bir kurumsal yönetim çerçevesi uygular.",
  },
  en: {
    eyebrow: "Governance",
    line1: "Transparency,",
    line2: "accountability.",
    lead: "Öztemur Group Of Companies applies a shared corporate governance framework across its group companies.",
  },
};

const PRINCIPLES_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Ana ilkelerimiz",
    title: "Dört temel ilke.",
    principle1_title: "Şeffaflık", principle1_body: "",
    principle2_title: "Hesap verebilirlik", principle2_body: "",
    principle3_title: "Bağımsızlık", principle3_body: "",
    principle4_title: "Etik", principle4_body: "",
  },
  en: {
    eyebrow: "Our core principles",
    title: "Four core principles.",
    principle1_title: "Transparency", principle1_body: "",
    principle2_title: "Accountability", principle2_body: "",
    principle3_title: "Independence", principle3_body: "",
    principle4_title: "Ethics", principle4_body: "",
  },
};

const ETHICS_FALLBACK: Record<string, Record<string, string>> = {
  tr: { eyebrow: "İş etiği", title: "İş etiği kurallarımız.", body: "" },
  en: { eyebrow: "Business ethics", title: "Our code of business conduct.", body: "" },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const [page, ui] = await Promise.all([
    getPageContent("governance", locale),
    getUiStrings(locale),
  ]);
  const hero = pickSection(page, "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  return buildMetadata(
    {
      title: ui["page.governance.title"] ?? "Governance",
      description: hero.lead,
      path: "/governance",
    },
    locale,
  );
}

export default async function Page() {
  const locale = await resolveLocale();
  const page = await getPageContent("governance", locale);
  const hero = pickSection(page, "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const principles = pickSection(page, "principles", PRINCIPLES_FALLBACK[locale] ?? PRINCIPLES_FALLBACK.en);
  const ethics = pickSection(page, "ethics", ETHICS_FALLBACK[locale] ?? ETHICS_FALLBACK.en);

  const principleList = [1, 2, 3, 4].map(i => ({
    title: principles[`principle${i}_title`],
    body: principles[`principle${i}_body`],
  })).filter(p => p.title);

  return (
    <main className="bg-cream text-charcoal">
      <Header variant="transparent-dark" />

      <section className="relative min-h-[78vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-soft via-midnight to-midnight-deep" />
          <div className="texture-grain absolute inset-0 opacity-25" />
          <div className="pattern-dots absolute inset-0 opacity-40" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-24 pt-44">
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1 className="text-display-xl text-ivory mb-10 max-w-4xl">
            {hero.line1}
            <br />
            <span className="italic font-light text-champagne">{hero.line2}</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed">{hero.lead}</p>
        </div>
      </section>

      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-7">
              <span className="eyebrow">{principles.eyebrow}</span>
              <div className="gold-rule mt-5 mb-8" />
              <h2 className="text-display-lg text-charcoal max-w-2xl">{principles.title}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {principleList.map((p, i) => (
              <div key={i} className="bg-surface p-10 md:p-12">
                <span className="font-display text-2xl text-charcoal mb-2 block">{p.title}</span>
                <div className="gold-rule mb-6" />
                <p className="text-on-muted font-light leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface py-24 md:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className="eyebrow">{ethics.eyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-md text-charcoal leading-tight">{ethics.title}</h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-on-muted text-lg font-light leading-loose">{ethics.body}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
