"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { getCompanies, getMediaUrl, type CompanyDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import { safeExternalUrl } from "@/lib/url";
import Icon from "@/components/Icon";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Şirketler",
    line1: "Tek bir vizyon,",
    line2: "çok sektör.",
    lead: "Birbirini tamamlayan sektörlerde faaliyet gösteren markalarımız, ortak bir disiplin ve uzun vadeli bir bakış açısıyla yönetiliyor.",
  },
  en: {
    eyebrow: "Companies",
    line1: "One vision,",
    line2: "many sectors.",
    lead: "Our brands operate across complementary sectors, run with a shared discipline and a long-term outlook.",
  },
};

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    sectorsHead: "Sektörler",
    all: "Tümü",
    loading: "Yükleniyor",
    none: "Henüz listelenmiş bir şirket yok.",
    empty: "Bu sektörde şirket bulunmuyor.",
    visit: "Web sitesi",
    contact: "İletişim",
    closeAria: "Kapat",
    details: "Detay",
  },
  en: {
    sectorsHead: "Sectors",
    all: "All",
    loading: "Loading",
    none: "No companies listed yet.",
    empty: "No companies in this sector.",
    visit: "Website",
    contact: "Contact",
    closeAria: "Close",
    details: "Details",
  },
};

const CTA_FALLBACK: Record<string, Record<string, string>> = {
  tr: { ctaTitle: "Birlikte iş yapmak ister misiniz?", cta: "Bize Ulaşın" },
  en: { ctaTitle: "Interested in working with us?", cta: "Get in Touch" },
};

export default function CompaniesPage() {
  const { locale } = useLanguage();
  const hero = useSection("companies", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const labels = useSection("companies", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const cta = useSection("companies", "cta", CTA_FALLBACK[locale] ?? CTA_FALLBACK.en);

  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [selected, setSelected] = useState<CompanyDto | null>(null);
  const [activeSector, setActiveSector] = useState<string>("__all__");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCompanies(1, 50, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setCompanies(res.data.items);
      else setError(res.message || "Failed to load companies.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const sectors = useMemo(() => {
    const seen = new Set<string>();
    return companies.map((co) => co.sector).filter((s) => s && !seen.has(s) && (seen.add(s), true));
  }, [companies]);

  const filtered = activeSector === "__all__"
    ? companies
    : companies.filter((co) => co.sector === activeSector);

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-soft via-midnight to-midnight-deep" />
          <div className="texture-grain absolute inset-0 opacity-25" />
          <div className="pattern-dots absolute inset-0 opacity-50" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-20 pt-44">
          <div className="flex items-center gap-4 mb-10 opacity-0 animate-fade-up">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1 className="text-display-xl text-ivory mb-10 max-w-4xl opacity-0 animate-fade-up-slow">
            {hero.line1}
            <br />
            <span className="italic font-light text-champagne">{hero.line2}</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed opacity-0 animate-fade-up-slow">
            {hero.lead}
          </p>
        </div>
      </section>

      {/* ── Filter rail ─────────────────────────────── */}
      <section className="bg-cream border-b border-border sticky top-[72px] md:top-[80px] z-20 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-5 flex items-center gap-6">
          <span className="eyebrow-muted hidden md:inline">{labels.sectorsHead}</span>
          <span className="hidden md:inline-block h-px w-8 bg-border" />
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0 flex-1">
            <button
              onClick={() => setActiveSector("__all__")}
              className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] border transition-all ${
                activeSector === "__all__"
                  ? "border-charcoal bg-charcoal text-cream"
                  : "border-border text-on-muted hover:border-charcoal hover:text-charcoal"
              }`}
            >
              {labels.all}
            </button>
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSector(s)}
                className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] border transition-all ${
                  activeSector === s
                    ? "border-charcoal bg-charcoal text-cream"
                    : "border-border text-on-muted hover:border-charcoal hover:text-charcoal"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="hidden md:inline text-[11px] tabular-nums text-on-muted">
            {String(filtered.length).padStart(2, "0")}
          </span>
        </div>
      </section>

      {/* ── Grid ────────────────────────────────────── */}
      <section className="bg-cream py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          {loading && (
            <div className="flex items-center justify-center py-32">
              <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-32">
              <Icon name="cloud_off" className="text-5xl text-on-muted/40 mb-6 block" />
              <p className="text-on-muted">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-32 border-y border-border">
              <p className="eyebrow-muted">{companies.length === 0 ? labels.none : labels.empty}</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              {filtered.map((co, idx) => (
                <button
                  key={co.id}
                  onClick={() => setSelected(co)}
                  className="group bg-surface text-start p-10 min-h-[340px] flex flex-col justify-between transition-colors duration-300 hover:bg-surface-muted/60"
                >
                  <div>
                    <div className="flex items-baseline justify-between mb-10">
                      <span className="text-[11px] tabular-nums text-on-muted/60">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="relative h-9 w-[110px] flex items-center justify-end">
                        <Image
                          src={getMediaUrl(co.logoUrl)}
                          alt={`${co.name} logo`}
                          fill
                          sizes="110px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <span className="eyebrow text-champagne block mb-3">{co.sector}</span>
                    <h3 className="font-display text-2xl text-charcoal leading-snug group-hover:text-champagne-dim transition-colors mb-4">
                      {co.name}
                    </h3>
                    <p className="text-on-muted font-light text-sm leading-relaxed line-clamp-3 whitespace-pre-line">
                      {co.description}
                    </p>
                  </div>
                  <div className="mt-8 flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-[0.24em] font-semibold text-charcoal group-hover:text-champagne transition-colors pb-1 border-b border-charcoal/30 group-hover:border-champagne">
                      {labels.details}
                    </span>
                    <Icon name="arrow_forward" className="text-base text-on-muted group-hover:text-champagne group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────── */}
      <section className="bg-midnight text-ivory py-16 border-t border-ivory/10 relative overflow-hidden">
        <div className="texture-grain absolute inset-0 opacity-10" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <h2 className="font-display text-2xl md:text-3xl text-ivory">{cta.ctaTitle}</h2>
          <Link href="/contact" className="btn-solid btn-solid-gold press-98">
            {cta.cta}
            <Icon name="arrow_forward" className="text-base" />
          </Link>
        </div>
      </section>

      {/* ── Detail modal ────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center px-4 md:px-12 py-12 transition-all duration-300 ${
          selected ? "opacity-100 pointer-events-auto bg-midnight/70 backdrop-blur-md" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSelected(null)}
      >
        <div
          className={`bg-surface max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-[0_40px_80px_rgba(10,26,47,0.4)] flex flex-col md:flex-row relative transition-all duration-400 ${
            selected ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelected(null)}
            aria-label={labels.closeAria}
            className="absolute top-5 end-5 w-10 h-10 border border-border hover:border-champagne hover:text-champagne flex items-center justify-center transition-colors z-20 bg-surface"
          >
            <Icon name="close" className="text-base" />
          </button>

          {/* Media panel — shows the company's uploaded image (logoUrl)
              at natural color on a cream tile. Works for both transparent
              logos and solid-bg images. */}
          <div className="w-full md:w-2/5 bg-surface-muted relative flex items-center justify-center p-10 md:p-12 min-h-[260px] md:min-h-full overflow-hidden border-b md:border-b-0 md:border-r border-border">
            <div className="texture-grain absolute inset-0 opacity-10 pointer-events-none" />
            {selected?.logoUrl && (
              <div className="relative w-full h-[260px]">
                <Image
                  src={getMediaUrl(selected.logoUrl)}
                  alt={selected.name}
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-contain"
                />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col overflow-y-auto max-h-[90vh]">
            {selected && (
              <>
                <span className="eyebrow text-champagne mb-3 block">{selected.sector}</span>
                <h2 className="font-display text-3xl md:text-4xl text-charcoal mb-5 leading-tight">
                  {selected.name}
                </h2>
                <div className="charcoal-rule mb-8" />

                <p className="text-on-muted text-base leading-loose font-light mb-10 whitespace-pre-line">
                  {selected.detailedDescription || selected.description}
                </p>

                <div className="border-t border-border pt-8 mt-auto">
                  <span className="eyebrow-muted block mb-6">{labels.contact}</span>
                  <ul className="space-y-4">
                    {(() => {
                      const websiteHref = safeExternalUrl(selected.websiteUrl);
                      return websiteHref && (
                        <li className="flex items-center gap-4">
                          <Icon name="language" className="text-base text-champagne" />
                          <a
                            href={websiteHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-charcoal hover:text-champagne transition-colors text-sm"
                          >
                            {websiteHref.replace(/^https?:\/\//, "")}
                          </a>
                        </li>
                      );
                    })()}
                    {selected.contactEmail && (
                      <li className="flex items-center gap-4">
                        <Icon name="mail" className="text-base text-champagne" />
                        <a
                          href={`mailto:${selected.contactEmail}`}
                          className="text-charcoal hover:text-champagne transition-colors text-sm"
                        >
                          {selected.contactEmail}
                        </a>
                      </li>
                    )}
                    {selected.phoneNumber && (
                      <li className="flex items-center gap-4">
                        <Icon name="phone" className="text-base text-champagne" />
                        <span className="text-charcoal text-sm">{selected.phoneNumber}</span>
                      </li>
                    )}
                    {selected.address && (
                      <li className="flex items-start gap-4">
                        <Icon name="location_on" className="text-base text-champagne mt-0.5" />
                        <span className="text-charcoal text-sm leading-relaxed whitespace-pre-line">
                          {selected.address}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
