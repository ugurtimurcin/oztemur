"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { getNewsBySlug, getMediaUrl, type NewsArticleDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";
import ShareBar from "@/components/ShareBar";

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Haber",
    back: "Tüm haberlere dön",
    published: "Yayın tarihi",
    share: "Paylaş",
    summary: "Özet",
    notFoundT: "Haber bulunamadı.",
    notFoundB: "Bu içerik kaldırılmış ya da taşınmış olabilir.",
    home: "Haberlere dön",
  },
  en: {
    eyebrow: "News",
    back: "Back to newsroom",
    published: "Published",
    share: "Share",
    summary: "Summary",
    notFoundT: "Article not found.",
    notFoundB: "This story may have been removed or moved.",
    home: "Back to newsroom",
  },
};

const DATE_LOCALE: Record<string, string> = { tr: "tr-TR", en: "en-GB" };

export default function NewsArticlePage() {
  const params = useParams();
  const { locale } = useLanguage();
  const c = useSection("news_detail", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const dateLocale = DATE_LOCALE[locale] ?? "en-GB";

  const [article, setArticle] = useState<NewsArticleDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!params?.id) { setLoading(false); return; }
    let cancelled = false;
    getNewsBySlug(params.id as string, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setArticle(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [params?.id, locale]);

  if (!mounted) return null;

  if (loading) {
    return (
      <main className="bg-cream min-h-screen flex items-center justify-center">
        <Header variant="solid" />
        <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!article) {
    return (
      <main className="bg-cream text-charcoal min-h-screen pt-44 pb-24 px-6">
        <Header variant="solid" />
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow text-on-muted">404</span>
          <h1 className="font-display text-5xl mt-5 mb-4">{c.notFoundT}</h1>
          <p className="text-on-muted mb-10">{c.notFoundB}</p>
          <Link href="/news" className="btn-solid btn-solid-midnight press-98">
            {c.home}
          </Link>
        </div>
      </main>
    );
  }

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

  const imageUrl = getMediaUrl(article.imageUrl);
  const paragraphs = (article.content || "").split("\n").filter((p) => p.trim() !== "");

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Editorial hero ──────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50 animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/15" />
          <div className="texture-grain absolute inset-0 opacity-20 mix-blend-overlay" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-10 lg:px-14 pb-24 pt-44">
          <Link
            href="/news"
            className="inline-flex items-center gap-3 mb-12 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/70 hover:text-champagne transition-colors"
          >
            <Icon name="west" className="text-base" />
            {c.back}
          </Link>

          <div className="flex items-center gap-4 mb-8 opacity-0 animate-fade-up">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{c.eyebrow}</span>
            <span className="text-[11px] uppercase tracking-[0.28em] text-ivory/55">
              {fmt(article.publishedAt)}
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-[4.5rem] text-ivory leading-[1.05] max-w-4xl opacity-0 animate-fade-up-slow">
            {article.title}
          </h1>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-32">
              <span className="eyebrow-muted block mb-3">{c.published}</span>
              <p className="font-display text-lg text-charcoal mb-8">
                {fmt(article.publishedAt)}
              </p>
              <span className="eyebrow-muted block mb-3">{c.share}</span>
              <ShareBar
                title={article.title}
                summary={article.summary}
                variant="compact"
              />
            </div>
          </aside>

          <article className="lg:col-span-9 prose-editorial">
            {paragraphs.length > 0 ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
              : <p>{article.content || article.summary}</p>}

            {article.summary && (
              <div className="my-16 border-s-2 border-champagne ps-8 py-4">
                <span className="eyebrow text-champagne block mb-4">{c.summary}</span>
                <p className="font-display text-2xl md:text-3xl text-charcoal leading-snug">
                  “{article.summary}”
                </p>
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
