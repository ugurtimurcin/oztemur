"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getNews, getMediaUrl, type NewsArticleDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const NEWSROOM_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Haberler",
    title: "Gündemden",
    intro: "Şirketlerimizden, yatırımlarımızdan ve sektörel gelişmelerden seçtiklerimiz.",
    cta: "Tüm Haberler",
    empty: "Henüz yayınlanmış haber yok.",
    read: "Okumaya devam et",
    locale: "tr-TR",
  },
  en: {
    eyebrow: "Newsroom",
    title: "Latest news",
    intro: "Selected updates from across our companies, investments and sectors.",
    cta: "All News",
    empty: "No news published yet.",
    read: "Read more",
    locale: "en-GB",
  },
};

export default function Newsroom() {
  const { locale } = useLanguage();
  const c = useSection("home", "newsroom", NEWSROOM_FALLBACK[locale] ?? NEWSROOM_FALLBACK.en);

  const [articles, setArticles] = useState<NewsArticleDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNews(1, 4, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setArticles(res.data.items);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locale]);

  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(c.locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const featured = articles[0];
  const rest = articles.slice(1, 4);

  return (
    <section className="relative bg-cream py-24 md:py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 md:mb-20 items-end">
          <div className="lg:col-span-7">
            <span className="eyebrow">{c.eyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-lg text-charcoal">{c.title}</h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-on-muted text-lg font-light leading-relaxed mb-6">{c.intro}</p>
            <Link href="/news" className="btn-link text-charcoal hover:text-champagne">
              {c.cta}
              <Icon name="arrow_forward" className="text-base arrow" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-32 flex justify-center">
            <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="py-24 text-center border-y border-border">
            <p className="eyebrow-muted">{c.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border">
            {/* Featured */}
            {featured && (
              <Link
                href={`/news/${featured.slug}`}
                className="lg:col-span-7 group bg-surface flex flex-col"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-midnight">
                  <Image
                    src={getMediaUrl(featured.imageUrl)}
                    alt={featured.title}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1000ms] ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 via-transparent to-transparent" />
                  <span className="absolute top-6 start-6 px-3 py-1.5 bg-cream/95 backdrop-blur text-[10px] uppercase tracking-[0.28em] text-charcoal font-semibold">
                    {c.eyebrow}
                  </span>
                </div>
                <div className="p-8 md:p-12 flex flex-col flex-1">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-on-muted mb-5">
                    {fmt(featured.publishedAt)}
                  </span>
                  <h3 className="font-display text-3xl md:text-4xl text-charcoal mb-5 leading-tight group-hover:text-champagne-dim transition-colors">
                    {featured.title}
                  </h3>
                  <p className="text-on-muted font-light leading-relaxed line-clamp-3 mb-8 flex-1">
                    {featured.summary}
                  </p>
                  <div className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 self-start group-hover:border-champagne group-hover:text-champagne transition-colors">
                    {c.read}
                    <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </Link>
            )}

            {/* Stack */}
            <div className="lg:col-span-5 flex flex-col bg-surface">
              {rest.length === 0 ? (
                <div className="p-10 text-center text-on-muted">{c.empty}</div>
              ) : (
                rest.map((a) => (
                  <Link
                    key={a.id}
                    href={`/news/${a.slug}`}
                    className="group flex-1 px-8 md:px-10 py-7 border-b border-border last:border-b-0 hover:bg-surface-muted/60 transition-colors flex flex-col justify-center"
                  >
                    <span className="text-[10px] uppercase tracking-[0.32em] text-on-muted mb-3">
                      {fmt(a.publishedAt)}
                    </span>
                    <h4 className="font-display text-xl md:text-2xl text-charcoal leading-snug group-hover:text-champagne-dim transition-colors line-clamp-2 mb-2">
                      {a.title}
                    </h4>
                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-on-muted group-hover:text-champagne transition-colors">
                      {c.read}
                      <Icon name="arrow_forward" className="text-sm group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
