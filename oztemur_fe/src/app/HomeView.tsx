"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HomeHero from "@/components/HomeHero";
import GroupAtGlance from "@/components/GroupAtGlance";
import SectorShowcase from "@/components/SectorShowcase";
import ProjectsShowcase from "@/components/ProjectsShowcase";
import Newsroom from "@/components/Newsroom";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const PHILOSOPHY_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Kurumsal felsefe",
    title: "Bir nesilden ötesini düşünmek.",
    body:
      "Bizim için holding olmak, yalnızca farklı sektörlerde şirket sahibi olmak değil; ortak bir disiplin, ortak bir itibar ve ortak bir hesap verebilirlik anlayışıyla iş yapmaktır. Her grup şirketimiz kendi alanında özerk; ortak değerlerimizde tek bir vücuttur.",
    cta: "Kurumsal Yönetim",
  },
  en: {
    eyebrow: "Corporate philosophy",
    title: "Thinking past a single generation.",
    body:
      "For us, being a holding is not about owning companies in different sectors. It is about doing business with a shared discipline, a shared reputation and a shared accountability. Every company in our group is autonomous in its sector — and one body in our values.",
    cta: "Governance",
  },
};

export default function Home() {
  const { locale } = useLanguage();
  const c = useSection("home", "philosophy", PHILOSOPHY_FALLBACK[locale] ?? PHILOSOPHY_FALLBACK.en);

  return (
    <main className="bg-cream">
      <Header variant="transparent-dark" />

      {/* ── 1. Cinematic hero ─────────────────────────── */}
      <HomeHero />

      {/* ── 2. Group at a glance (dark stats) ─────────── */}
      <GroupAtGlance />

      {/* ── 3. Sector / companies showcase ─────────────── */}
      <SectorShowcase />

      {/* ── 4. Editorial philosophy band ──────────────── */}
      <section className="relative bg-surface border-t border-border py-24 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <span className="eyebrow">{c.eyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-lg text-charcoal leading-tight">
              {c.title}
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="relative aspect-[4/3] overflow-hidden mb-12 bg-midnight">
              <Image
                src="/images/home-philosophy.webp"
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-90 hover:scale-105 transition-transform duration-[1500ms] ease-out"
              />
            </div>
            <p className="text-on-muted text-lg md:text-xl font-light leading-loose mb-10">
              {c.body}
            </p>
            <Link href="/about" className="btn-link text-charcoal hover:text-champagne">
              {c.cta}
              <Icon name="arrow_forward" className="text-base arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Projects showcase ──────────────────────── */}
      <ProjectsShowcase />

      {/* ── 6. Newsroom ───────────────────────────────── */}
      <Newsroom />
    </main>
  );
}
