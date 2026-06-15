"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HeroMedia, { ManagedMedia } from "@/components/HeroMedia";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Reveal from "@/components/Reveal";
import Icon from "@/components/Icon";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    heroMedia: "",
    heroMediaActive: "false",
    eyebrow: "Kurumsal kimlik",
    heroLine1: "Kalıcı eserler",
    heroLine2: "üreten bir aile.",
    heroLead:
      "Öztemur Group Of Companies; inşaat, gayrimenkul, enerji, lojistik ve ticaret alanlarında faaliyet gösteren çok sektörlü bir aile şirketidir. Onlarca yıllık birikimimizi, ortak değerler ve uzun vadeli bir bakış açısıyla yönettiğimiz bir grup yapısına dönüştürdük.",
  },
  en: {
    heroMedia: "",
    heroMediaActive: "false",
    eyebrow: "Corporate identity",
    heroLine1: "A family that builds",
    heroLine2: "things that last.",
    heroLead:
      "Öztemur Group Of Companies is a multi-sector family-owned group operating across construction, real estate, energy, logistics and trade. Decades of craft, shaped into a group structure run with shared values and a long-term outlook.",
  },
};

const STORY_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    storyImage: "",
    storyImageActive: "false",
    storyEyebrow: "Hikâyemiz",
    storyTitle: "1985'ten bugüne, aynı disiplin.",
    storyBodyA:
      "Holding olmak bizim için yalnızca farklı şirketlere sahip olmak değildir. Holding olmak, ortak bir disiplin, ortak bir itibar ve nesilden nesile aktarılan bir hesap verebilirlik anlayışıdır.",
    storyBodyB:
      "Her grup şirketimiz kendi sektöründe bağımsız karar verir, kendi ekosistemini kurar; ortak değerlerimizde tek bir vücut gibi çalışır. Bu denge, hem hızlı karar almamızı hem de uzun ömürlü kurumsal yapımızı korumamızı sağlar.",
  },
  en: {
    storyImage: "",
    storyImageActive: "false",
    storyEyebrow: "Our story",
    storyTitle: "Since 1985, the same discipline.",
    storyBodyA:
      "Being a holding, for us, is not about owning companies in different sectors. It is about a shared discipline, a shared reputation, and an accountability handed from one generation to the next.",
    storyBodyB:
      "Each company in our group makes its own decisions in its sector, builds its own ecosystem, and acts as one body in our shared values. This balance lets us move quickly and stay institutional at the same time.",
  },
};

const VALUES_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    pillarsEyebrow: "Değerlerimiz",
    pillarsTitle: "Üç ilke üzerine kurulu bir kurumsal kültür.",
    pillar1_no: "01", pillar1_title: "Güven",
    pillar1_body: "Her ortaklık, her sözleşme ve her teslimat; isminizin uzun yıllar arkasında durabileceği bir taahhütle imzalanır.",
    pillar2_no: "02", pillar2_title: "Kalite",
    pillar2_body: "Standartlarımızı pazarın değil, kendi disiplinimizin belirlemesine inanırız. Sıradanı değil, kalıcı olanı tasarlarız.",
    pillar3_no: "03", pillar3_title: "Süreklilik",
    pillar3_body: "Bugünkü kararlarımızı bir sonraki nesle bırakacağımız bir miras gibi alırız. Sermayemizden uzun ömürlü olan, itibarımızdır.",
  },
  en: {
    pillarsEyebrow: "Our values",
    pillarsTitle: "A culture built on three principles.",
    pillar1_no: "01", pillar1_title: "Trust",
    pillar1_body: "Every partnership, every contract and every delivery is signed with a commitment we are willing to stand behind for years.",
    pillar2_no: "02", pillar2_title: "Craft",
    pillar2_body: "We let our discipline — not the market — set our standards. We design what endures, not what is merely on trend.",
    pillar3_no: "03", pillar3_title: "Continuity",
    pillar3_body: "We make today's decisions as if they were a legacy for the next generation. What outlasts our capital is our reputation.",
  },
};

const LEADERSHIP_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    leadershipImage: "",
    leadershipImageActive: "false",
    leadershipEyebrow: "Yönetim anlayışı",
    leadershipTitle: "Bağımsız şirketler, ortak yönetim.",
    leadershipBody:
      "Grup şirketlerimiz kendi alanlarında özerk yönetilir; finansal disiplin, etik standartlar ve kurumsal yönetim ilkeleri ise holdingin tek elden uyguladığı çerçeveyi oluşturur. Bu yapı, her şirkete kendi sektörüne özgü çevikliği korurken Öztemur kalitesini taşıma imkânı verir.",
    cta: "Bize Ulaşın",
  },
  en: {
    leadershipImage: "",
    leadershipImageActive: "false",
    leadershipEyebrow: "Governance",
    leadershipTitle: "Independent companies, shared stewardship.",
    leadershipBody:
      "Each group company is run autonomously in its sector. Financial discipline, ethical standards and corporate governance principles form the single framework the holding applies across the group — letting every company stay agile while carrying the Öztemur standard.",
    cta: "Get in Touch",
  },
};

export default function AboutPage() {
  const { locale } = useLanguage();
  const hero = useSection("about", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const story = useSection("about", "story", STORY_FALLBACK[locale] ?? STORY_FALLBACK.en);
  const values = useSection("about", "values", VALUES_FALLBACK[locale] ?? VALUES_FALLBACK.en);
  const leadership = useSection("about", "leadership", LEADERSHIP_FALLBACK[locale] ?? LEADERSHIP_FALLBACK.en);
  const pillars = [1, 2, 3].map(i => ({
    no: values[`pillar${i}_no`] ?? "",
    title: values[`pillar${i}_title`] ?? "",
    body: values[`pillar${i}_body`] ?? "",
  }));

  return (
    <main className="bg-cream text-charcoal">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          {/* Fallback image (used when admin has not activated a custom media). */}
          <Image
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50 animate-ken-burns"
            src="/images/about-hero.webp"
          />
          {/* Admin-managed media — overlays the fallback when active. */}
          <HeroMedia src={hero.heroMedia} active={hero.heroMediaActive} overlay={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
          <div className="texture-grain absolute inset-0 opacity-25 mix-blend-overlay" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-24 pt-44">
          <div className="flex items-center gap-4 mb-10 opacity-0 animate-fade-up">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1 className="text-display-xl text-ivory mb-10 max-w-4xl opacity-0 animate-fade-up-slow">
            {hero.heroLine1}
            <br />
            <span className="italic font-light text-champagne">{hero.heroLine2}</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed opacity-0 animate-fade-up-slow">
            {hero.heroLead}
          </p>
        </div>
      </section>

      {/* ── Story (editorial split) ─────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <Reveal direction="left" className="lg:col-span-5 lg:sticky lg:top-32">
            <span className="eyebrow">{story.storyEyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-lg text-charcoal leading-tight">{story.storyTitle}</h2>
          </Reveal>
          <Reveal direction="right" delay={120} className="lg:col-span-6 lg:col-start-7">
            <p className="text-on-muted text-xl font-light leading-loose mb-10">{story.storyBodyA}</p>
            <div className="relative aspect-[4/3] overflow-hidden bg-midnight my-12">
              <ManagedMedia
                src={story.storyImage}
                active={story.storyImageActive}
                fallbackSrc="/images/construction_demo.png"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-[1500ms] ease-out"
              />
            </div>
            <p className="text-on-muted text-lg font-light leading-loose">{story.storyBodyB}</p>
          </Reveal>
        </div>
      </section>

      {/* ── Values pillars ──────────────────────────── */}
      <section className="bg-midnight text-ivory py-24 md:py-32 relative overflow-hidden">
        <div className="texture-grain absolute inset-0 opacity-15 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 md:mb-20">
              <div className="lg:col-span-6">
                <span className="eyebrow">{values.pillarsEyebrow}</span>
                <div className="gold-rule mt-5 mb-8" />
                <h2 className="text-display-lg text-ivory">{values.pillarsTitle}</h2>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ivory/10">
            {pillars.map((p, i) => (
              <Reveal key={p.no} delay={i * 150}>
                <div className="bg-midnight p-10 md:p-12 group h-full">
                  <div className="flex items-baseline justify-between mb-10">
                    <span className="font-display text-5xl text-champagne">{p.no}</span>
                    <span className="h-px w-16 bg-ivory/15 group-hover:bg-champagne transition-colors duration-500" />
                  </div>
                  <h3 className="font-display text-3xl text-ivory mb-5">{p.title}</h3>
                  <p className="text-ivory/65 font-light leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Governance ───────────────────────────────── */}
      <section className="bg-surface py-24 md:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <Reveal direction="left" className="lg:col-span-7">
            <span className="eyebrow">{leadership.leadershipEyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-md text-charcoal mb-8 leading-tight">{leadership.leadershipTitle}</h2>
            <p className="text-on-muted text-lg font-light leading-loose mb-10">{leadership.leadershipBody}</p>
            <Link href="/contact" className="btn-solid btn-solid-midnight press-98">
              {leadership.cta}
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </Reveal>
          <Reveal direction="right" delay={120} className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden bg-midnight">
              <ManagedMedia
                src={leadership.leadershipImage}
                active={leadership.leadershipImageActive}
                fallbackSrc="/images/about-leadership.webp"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-[1500ms] ease-out"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
