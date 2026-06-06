import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent, getUiStrings, pickSection } from "@/lib/server/siteContent";
import Header from "@/components/Header";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Sürdürülebilirlik",
    line1: "Bugünden",
    line2: "yarına emanet.",
    lead: "Faaliyet gösterdiğimiz her sektörde çevreye, insana ve topluma karşı uzun vadeli bir sorumluluk taşırız.",
  },
  en: {
    eyebrow: "Sustainability",
    line1: "Building for",
    line2: "the next generation.",
    lead: "In every sector we operate in we carry a long-term responsibility — to the environment, to people and to society.",
  },
};

const PILLARS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Üç temel başlık",
    title: "Çevre, insan, yönetim.",
    pillar1_no: "01", pillar1_title: "Çevre", pillar1_body: "",
    pillar2_no: "02", pillar2_title: "İnsan", pillar2_body: "",
    pillar3_no: "03", pillar3_title: "Yönetim", pillar3_body: "",
  },
  en: {
    eyebrow: "Three pillars",
    title: "Environment, people, governance.",
    pillar1_no: "01", pillar1_title: "Environment", pillar1_body: "",
    pillar2_no: "02", pillar2_title: "People", pillar2_body: "",
    pillar3_no: "03", pillar3_title: "Governance", pillar3_body: "",
  },
};

const COMMITMENTS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Taahhütlerimiz",
    title: "Söylemle değil, kararla.",
    commitment1_label: "", commitment1_body: "",
    commitment2_label: "", commitment2_body: "",
    commitment3_label: "", commitment3_body: "",
    commitment4_label: "", commitment4_body: "",
  },
  en: {
    eyebrow: "Our commitments",
    title: "Action over rhetoric.",
    commitment1_label: "", commitment1_body: "",
    commitment2_label: "", commitment2_body: "",
    commitment3_label: "", commitment3_body: "",
    commitment4_label: "", commitment4_body: "",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const [page, ui] = await Promise.all([
    getPageContent("sustainability", locale),
    getUiStrings(locale),
  ]);
  const hero = pickSection(page, "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  return buildMetadata(
    {
      title: ui["page.sustainability.title"] ?? "Sustainability",
      description: hero.lead,
      path: "/sustainability",
    },
    locale,
  );
}

export default async function Page() {
  const locale = await resolveLocale();
  const page = await getPageContent("sustainability", locale);
  const hero = pickSection(page, "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const pillars = pickSection(page, "pillars", PILLARS_FALLBACK[locale] ?? PILLARS_FALLBACK.en);
  const commitments = pickSection(page, "commitments", COMMITMENTS_FALLBACK[locale] ?? COMMITMENTS_FALLBACK.en);

  const pillarList = [1, 2, 3].map(i => ({
    no: pillars[`pillar${i}_no`],
    title: pillars[`pillar${i}_title`],
    body: pillars[`pillar${i}_body`],
  })).filter(p => p.title);

  const commitmentList = [1, 2, 3, 4].map(i => ({
    label: commitments[`commitment${i}_label`],
    body: commitments[`commitment${i}_body`],
  })).filter(c => c.label || c.body);

  return (
    <main className="bg-cream text-charcoal">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <img
            alt=""
            aria-hidden
            className="w-full h-full object-cover opacity-45 animate-ken-burns"
            src="/images/sustainability-hero.webp"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
          <div className="texture-grain absolute inset-0 opacity-25 mix-blend-overlay" />
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

      {/* ── Pillars ─────────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-7">
              <span className="eyebrow">{pillars.eyebrow}</span>
              <div className="gold-rule mt-5 mb-8" />
              <h2 className="text-display-lg text-charcoal max-w-2xl">{pillars.title}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {pillarList.map(p => (
              <div key={p.no} className="bg-surface p-10 md:p-12 group">
                <div className="flex items-baseline justify-between mb-10">
                  <span className="font-display text-5xl text-champagne">{p.no}</span>
                  <span className="h-px w-16 bg-border group-hover:bg-champagne transition-colors duration-500" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-charcoal mb-5">{p.title}</h3>
                <p className="text-on-muted font-light leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commitments ─────────────────────────────── */}
      <section className="bg-midnight text-ivory py-24 md:py-32 relative overflow-hidden">
        <div className="texture-grain absolute inset-0 opacity-15 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-7">
              <span className="eyebrow">{commitments.eyebrow}</span>
              <div className="gold-rule mt-5 mb-8" />
              <h2 className="text-display-lg text-ivory">{commitments.title}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ivory/10">
            {commitmentList.map((c, i) => (
              <div key={i} className="bg-midnight p-8 md:p-10">
                <span className="eyebrow text-champagne block mb-3">{c.label}</span>
                <div className="gold-rule mb-6" />
                <p className="text-ivory/75 font-light leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
