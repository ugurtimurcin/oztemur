"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import Reveal from "@/components/Reveal";
import { getBlogPosts, getMediaUrl, type BlogPostDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const PAGE_SIZE = 8;

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "İçgörüler",
    line1: "Düşünmeye",
    line2: "değer fikirler.",
    lead: "Sektörlerimize, yatırım yaklaşımımıza ve kurumsal felsefemize dair derinlikli yazılar.",
  },
  en: {
    eyebrow: "Insights",
    line1: "Ideas worth",
    line2: "thinking about.",
    lead: "Long-form writing on our sectors, our investment approach and our corporate philosophy.",
  },
};

const ABOUT_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    aboutTitle: "Bu Köşe Hakkında",
    aboutBody: "Burada yazdıklarımız bir basın bültenleri kümesi değil. Sektörlerimize, makro gündemimize ve kurumsal felsefemize dair düşüncelerimizi okurla aynı dilde paylaşıyoruz.",
  },
  en: {
    aboutTitle: "About This Section",
    aboutBody: "What we publish here is not a stream of press releases. It is our thinking on the sectors we work in, the macro context we operate in and the philosophy that shapes our group.",
  },
};

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    empty: "Henüz yayınlanmış bir yazı yok.",
    by: "Yazar:",
    read: "Okumaya devam et",
    paginationPrev: "Önceki",
    paginationNext: "Sonraki",
    paginationPage: "Sayfa",
    paginationOf: "/",
  },
  en: {
    empty: "No essays published yet.",
    by: "By",
    read: "Read essay",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationPage: "Page",
    paginationOf: "of",
  },
};

const DATE_LOCALE: Record<string, string> = { tr: "tr-TR", en: "en-GB" };

export default function BlogPage() {
  const { locale } = useLanguage();
  const hero = useSection("blog", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const aboutSec = useSection("blog", "about", ABOUT_FALLBACK[locale] ?? ABOUT_FALLBACK.en);
  const labels = useSection("blog", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const dateLocale = DATE_LOCALE[locale] ?? "en-GB";

  const [posts, setPosts] = useState<BlogPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setPage(1); }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBlogPosts(page, PAGE_SIZE, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setPosts(res.data.items);
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

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-tint via-midnight to-midnight-deep" />
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

      {/* ── Body ────────────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20">
          {/* Feed */}
          <div ref={listRef} className="lg:col-span-8 flex flex-col">
            {loading ? (
              <div className="py-32 flex justify-center">
                <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="py-24 text-center border-y border-border">
                <p className="eyebrow-muted">{labels.empty}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {posts.map((post, i) => (
                  <Reveal key={post.id} delay={(i % 4) * 100}><article className="group py-12 first:pt-0 last:pb-0">
                    <Link href={`/blog/${post.slug}`} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                      {post.imageUrl && (
                        <div className="md:col-span-4 relative aspect-[4/3] overflow-hidden bg-midnight">
                          <Image
                            src={getMediaUrl(post.imageUrl)}
                            alt={post.title}
                            fill
                            sizes="(min-width: 768px) 33vw, 100vw"
                            className="object-cover opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-[1100ms] ease-out"
                          />
                        </div>
                      )}
                      <div className={post.imageUrl ? "md:col-span-8" : "md:col-span-12"}>
                        <div className="flex items-center gap-4 mb-5">
                          <span className="eyebrow text-champagne">{hero.eyebrow}</span>
                          <span className="h-px w-6 bg-border" />
                          <span className="text-[11px] uppercase tracking-[0.28em] text-on-muted">
                            {fmt(post.publishedAt)}
                          </span>
                        </div>
                        <h2 className="font-display text-3xl md:text-[2.25rem] text-charcoal mb-5 leading-tight group-hover:text-champagne-dim transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-on-muted text-lg font-light leading-relaxed mb-6 line-clamp-3">
                          {post.summary}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.28em] text-on-muted">
                            {labels.by} <span className="text-charcoal font-semibold">{post.author}</span>
                          </span>
                          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 group-hover:border-champagne group-hover:text-champagne transition-colors">
                            {labels.read}
                            <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article></Reveal>
                ))}
              </div>
            )}
            {!loading && posts.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                labels={{ previous: labels.paginationPrev, next: labels.paginationNext, page: labels.paginationPage, of: labels.paginationOf }}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <div className="bg-midnight text-ivory p-10 relative overflow-hidden">
                <div className="texture-grain absolute inset-0 opacity-15 pointer-events-none" />
                <div className="relative">
                  <span className="eyebrow text-champagne block mb-5">{aboutSec.aboutTitle}</span>
                  <div className="gold-rule mb-6" />
                  <p className="text-ivory/75 font-light leading-relaxed">{aboutSec.aboutBody}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
