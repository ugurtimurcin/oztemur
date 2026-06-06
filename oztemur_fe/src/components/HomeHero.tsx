"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import HeroMedia from "@/components/HeroMedia";
import Icon from "@/components/Icon";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    heroMedia: "",
    heroMediaActive: "false",
    eyebrow: "1985'ten bugüne · Bir aile, bir grup",
    line1: "Nesilden nesile",
    line2: "güven inşa ediyoruz.",
    body:
      "Öztemur Group Of Companies, inşaat, gayrimenkul, enerji, lojistik ve ticaret alanlarında faaliyet gösteren çok sektörlü bir şirketler ailesidir.",
    primary: "Grubu Keşfet",
    secondary: "Bize Ulaşın",
  },
  en: {
    heroMedia: "",
    heroMediaActive: "false",
    eyebrow: "Since 1985 · A family, a group",
    line1: "Building generations",
    line2: "of trust.",
    body:
      "Öztemur Group Of Companies is a multi-sector family of companies operating across construction, real estate, energy, logistics and trade.",
    primary: "Discover the Group",
    secondary: "Get in Touch",
  },
};

export default function HomeHero() {
  const { locale } = useLanguage();
  const t = useSection("home", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);

  return (
    <section className="relative min-h-screen flex items-end overflow-hidden bg-midnight text-ivory">
      {/* ── Cinematic backdrop ─────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Default backdrop — gradient + texture + dot pattern only.
            No baseline image: the homepage hero ships imageless. */}
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-soft via-midnight to-midnight-deep" />
        <div className="texture-grain absolute inset-0 opacity-25" />
        <div className="pattern-dots absolute inset-0 opacity-50" />

        {/* Admin-managed image or video, overlaid on top of the gradient
            backdrop when (heroMediaActive === "true" && heroMedia is non-empty). */}
        <HeroMedia src={t.heroMedia} active={t.heroMediaActive} overlay={false} />

        {/* Legibility gradients — always on top of any media. */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/85 via-midnight/40 to-transparent" />
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-20 md:pb-28 lg:pb-32 pt-40">
        <div className="max-w-4xl">
          <div className="flex items-center gap-4 mb-10 opacity-0 animate-fade-up">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{t.eyebrow}</span>
          </div>

          <h1 className="text-display-xl text-ivory mb-10 opacity-0 animate-fade-up-slow">
            {t.line1}
            <br />
            <span className="italic font-light text-champagne">{t.line2}</span>
          </h1>

          <p className="max-w-xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed mb-12 opacity-0 animate-fade-up-slow">
            {t.body}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 opacity-0 animate-fade-up-slow">
            <Link href="/companies" className="btn-solid btn-solid-gold press-98">
              {t.primary}
              <Icon name="arrow_forward" className="text-base" />
            </Link>
            <Link href="/contact" className="btn-outline-ivory press-98 inline-flex items-center justify-center gap-3">
              {t.secondary}
            </Link>
          </div>
        </div>
      </div>

    </section>
  );
}
