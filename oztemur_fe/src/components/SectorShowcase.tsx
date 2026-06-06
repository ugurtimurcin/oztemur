"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getCompanies, getMediaUrl, type CompanyDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const SECTORS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Grup şirketleri",
    title: "Tek bir vizyon, çok sektör",
    intro:
      "Birbirini tamamlayan sektörlerde faaliyet gösteren markalarımız, ortak bir disiplin ve uzun vadeli bir bakış açısıyla yönetiliyor.",
    cta: "Tüm Şirketler",
    empty: "Henüz listelenmiş bir şirket yok.",
    sector: "Sektör",
    sectorsLabel: "Sektörler",
    learnMore: "Detay",
  },
  en: {
    eyebrow: "Group companies",
    title: "One vision, many sectors",
    intro:
      "Our brands operate across complementary sectors, run with a shared discipline and a long-term outlook.",
    cta: "All Companies",
    empty: "No companies listed yet.",
    sector: "Sector",
    sectorsLabel: "Sectors",
    learnMore: "Learn more",
  },
};

export default function SectorShowcase() {
  const { locale } = useLanguage();
  const c = useSection("home", "sectors", SECTORS_FALLBACK[locale] ?? SECTORS_FALLBACK.en);

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCompanies(1, 12, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setCompanies(res.data.items);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locale]);

  const sectors = useMemo(() => {
    const seen = new Set<string>();
    return companies
      .map((co) => co.sector)
      .filter((s) => s && !seen.has(s) && (seen.add(s), true));
  }, [companies]);

  const activeCompany = companies[activeIdx];

  return (
    <section className="relative bg-cream py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        {/* ── Header ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 md:mb-20">
          <div className="lg:col-span-7">
            <span className="eyebrow">{c.eyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-lg text-charcoal max-w-xl">{c.title}</h2>
          </div>
          <div className="lg:col-span-5 lg:pt-6 self-end">
            <p className="text-on-muted text-lg font-light leading-relaxed mb-8">
              {c.intro}
            </p>
            <Link href="/companies" className="btn-link text-charcoal hover:text-champagne">
              {c.cta}
              <Icon name="arrow_forward" className="text-base arrow" />
            </Link>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────── */}
        {loading ? (
          <div className="py-32 flex justify-center">
            <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="py-24 text-center border-y border-border">
            <p className="eyebrow-muted">{c.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border">
            {/* Stage panel */}
            <div className="lg:col-span-7 bg-midnight text-ivory relative min-h-[480px] overflow-hidden group">
              <div
                key={activeCompany?.id}
                className="absolute inset-0 opacity-40 transition-opacity duration-700"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(10,26,47,0.6), rgba(10,26,47,0.95)), url(${getMediaUrl(activeCompany?.logoUrl)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="texture-grain absolute inset-0 opacity-15" />
              <div className="relative h-full flex flex-col justify-between p-10 md:p-14">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.32em] text-ivory/50">
                    {String(activeIdx + 1).padStart(2, "0")} / {String(companies.length).padStart(2, "0")}
                  </span>
                </div>

                <div>
                  <span className="eyebrow text-champagne">{activeCompany?.sector}</span>
                  <div className="gold-rule mt-4 mb-6" />
                  <h3 className="font-display text-3xl md:text-5xl text-ivory mb-6 leading-tight">
                    {activeCompany?.name}
                  </h3>
                  <p className="text-ivory/70 font-light leading-relaxed max-w-lg mb-8 line-clamp-3">
                    {activeCompany?.description}
                  </p>
                  <Link
                    href="/companies"
                    className="btn-link text-ivory hover:text-champagne"
                  >
                    {c.learnMore}
                    <Icon name="arrow_forward" className="text-base arrow" />
                  </Link>
                </div>
              </div>
            </div>

            {/* List panel */}
            <div className="lg:col-span-5 bg-surface flex flex-col">
              <div className="px-8 md:px-10 py-6 border-b border-border flex items-center justify-between">
                <span className="eyebrow-muted">{c.sector}</span>
                <span className="text-[10px] uppercase tracking-[0.32em] text-on-muted">
                  {companies.length} {companies.length === 1 ? "" : ""}
                </span>
              </div>
              <ul className="flex-1 overflow-auto hide-scrollbar max-h-[480px]">
                {companies.map((co, idx) => {
                  const active = idx === activeIdx;
                  return (
                    <li key={co.id}>
                      <button
                        onClick={() => setActiveIdx(idx)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`w-full text-start px-8 md:px-10 py-5 border-b border-border/60 flex items-center justify-between gap-4 transition-colors duration-300 ${
                          active ? "bg-surface-muted" : "bg-surface hover:bg-surface-muted/50"
                        }`}
                      >
                        <div className="flex items-baseline gap-4 min-w-0">
                          <span className={`text-[11px] tabular-nums ${active ? "text-champagne" : "text-on-muted/60"}`}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <span className={`block text-[10px] uppercase tracking-[0.32em] mb-1 truncate ${active ? "text-champagne" : "text-on-muted"}`}>
                              {co.sector}
                            </span>
                            <span className="font-display text-lg md:text-xl text-charcoal truncate block">
                              {co.name}
                            </span>
                          </div>
                        </div>
                        <Icon
                          name="arrow_forward"
                          className={`text-lg transition-all flex-shrink-0 ${
                            active ? "text-champagne translate-x-1" : "text-on-muted/40"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Sector pills (visual hint) */}
        {sectors.length > 0 && (
          <div className="mt-16 flex flex-wrap items-center gap-3">
            <span className="eyebrow-muted">{c.sectorsLabel}</span>
            <span className="h-px w-8 bg-border" />
            {sectors.map((s) => (
              <span
                key={s}
                className="px-4 py-2 border border-border text-[11px] uppercase tracking-[0.24em] text-on-muted hover:border-champagne hover:text-charcoal transition-colors cursor-default"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
