"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import Reveal from "@/components/Reveal";
import { getNews, getMediaUrl, type NewsArticleDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const PAGE_SIZE = 12;

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Haberler",
    line1: "Gündemden",
    line2: "ve grubumuzdan.",
    lead: "Şirketlerimizden, yatırımlarımızdan ve faaliyet gösterdiğimiz sektörlerdeki gelişmelerden seçtiklerimiz.",
  },
  en: {
    eyebrow: "Newsroom",
    line1: "Updates from",
    line2: "across the group.",
    lead: "Selected updates from our companies, our investments and the sectors in which we operate.",
  },
};

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    empty: "Henüz yayınlanmış haber yok.",
    read: "Okumaya devam et",
    archive: "Arşiv",
    paginationPrev: "Önceki",
    paginationNext: "Sonraki",
    paginationPage: "Sayfa",
    paginationOf: "/",
  },
  en: {
    empty: "No news published yet.",
    read: "Read more",
    archive: "Archive",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationPage: "Page",
    paginationOf: "of",
  },
};

const DATE_LOCALE: Record<string, string> = { tr: "tr-TR", en: "en-GB" };

export default function NewsPage() {
  const { locale } = useLanguage();
  const hero = useSection("news", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const labels = useSection("news", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const dateLocale = DATE_LOCALE[locale] ?? "en-GB";

  const [articles, setArticles] = useState<NewsArticleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset to page 1 whenever the locale changes — otherwise an out-of-range
  // page from the previous language could leave the user staring at an empty
  // list.
  useEffect(() => { setPage(1); }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNews(page, PAGE_SIZE, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setArticles(res.data.items);
        setTotalPages(Math.max(1, Math.ceil(res.data.totalCount / res.data.pageSize)));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locale, page]);

  const handlePageChange = (next: number) => {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(dateLocale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  // Featured layout only on page 1 — subsequent pages just show the grid,
  // because the featured concept doesn't apply once you're scrolling history.
  const featured = page === 1 ? articles[0] : null;
  const rest = page === 1 ? articles.slice(1) : articles;

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden bg-midnight text-ivory">
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

      {/* ── Articles ───────────────────────────────── */}
      <div ref={listRef}>
      {loading ? (
        <section className="py-32 flex justify-center">
          <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
        </section>
      ) : articles.length === 0 ? (
        <section className="py-32 text-center">
          <p className="eyebrow-muted">{labels.empty}</p>
        </section>
      ) : (
        <>
          {featured && (
            <section className="bg-cream py-20 md:py-24">
              <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
                <Link
                  href={`/news/${featured.slug}`}
                  className="group grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border"
                >
                  <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto bg-midnight overflow-hidden">
                    <Image
                      src={getMediaUrl(featured.imageUrl)}
                      alt={featured.title}
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      className="object-cover opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-[1200ms] ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight/40 via-transparent to-transparent" />
                  </div>
                  <div className="lg:col-span-5 bg-surface p-10 md:p-12 lg:p-14 flex flex-col justify-center">
                    <span className="eyebrow text-champagne mb-4">{hero.eyebrow}</span>
                    <h2 className="font-display text-3xl md:text-4xl lg:text-[2.75rem] text-charcoal mb-6 leading-tight group-hover:text-champagne-dim transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-on-muted text-base md:text-lg font-light leading-relaxed mb-8 line-clamp-3">
                      {featured.summary}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.28em]">
                      <span className="text-on-muted font-medium">{fmt(featured.publishedAt)}</span>
                      <span className="h-px w-6 bg-border" />
                      <span className="inline-flex items-center gap-2 text-charcoal font-semibold pb-1.5 border-b border-charcoal/30 group-hover:border-champagne group-hover:text-champagne transition-colors">
                        {labels.read}
                        <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className={featured ? "bg-cream py-12 md:py-20 border-t border-border" : "bg-cream py-20 md:py-24"}>
              <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
                <div className="flex items-end justify-between mb-12">
                  <div>
                    <span className="eyebrow">{labels.archive}</span>
                    <div className="gold-rule mt-5 mb-5" />
                    <h2 className="text-display-md text-charcoal">{hero.eyebrow}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
                  {rest.map((a, i) => (
                    <Reveal key={a.id} delay={(i % 3) * 120}>
                      <Link href={`/news/${a.slug}`} className="group flex flex-col">
                        <div className="relative aspect-[4/3] overflow-hidden bg-midnight mb-6">
                          <Image
                            src={getMediaUrl(a.imageUrl)}
                            alt={a.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1100ms] ease-out"
                          />
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.28em] text-on-muted mb-4">
                          {fmt(a.publishedAt)}
                        </span>
                        <h3 className="font-display text-2xl text-charcoal leading-snug mb-4 group-hover:text-champagne-dim transition-colors line-clamp-2">
                          {a.title}
                        </h3>
                        <p className="text-on-muted font-light leading-relaxed line-clamp-3 mb-5">
                          {a.summary}
                        </p>
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 self-start group-hover:border-champagne group-hover:text-champagne transition-colors">
                          {labels.read}
                          <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      </Link>
                    </Reveal>
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  labels={{ previous: labels.paginationPrev, next: labels.paginationNext, page: labels.paginationPage, of: labels.paginationOf }}
                />
              </div>
            </section>
          )}
        </>
      )}
      </div>
    </main>
  );
}
