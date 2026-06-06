"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { getBlogPostBySlug, getMediaUrl, type BlogPostDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";
import ShareBar from "@/components/ShareBar";

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "İçgörü",
    back: "Tüm yazılara dön",
    by: "Yazar",
    published: "Yayın tarihi",
    share: "Paylaş",
    notFoundT: "Yazı bulunamadı.",
    notFoundB: "Bu içerik kaldırılmış ya da taşınmış olabilir.",
    home: "İçgörülere dön",
  },
  en: {
    eyebrow: "Insight",
    back: "Back to all insights",
    by: "By",
    published: "Published",
    share: "Share",
    notFoundT: "Essay not found.",
    notFoundB: "This piece may have been removed or moved.",
    home: "Back to insights",
  },
};

const DATE_LOCALE: Record<string, string> = { tr: "tr-TR", en: "en-GB" };

export default function BlogPostPage() {
  const params = useParams();
  const { locale } = useLanguage();
  const c = useSection("blog_detail", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const dateLocale = DATE_LOCALE[locale] ?? "en-GB";

  const [post, setPost] = useState<BlogPostDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) { setLoading(false); return; }
    let cancelled = false;
    getBlogPostBySlug(params.id as string, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setPost(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [params?.id, locale]);

  if (loading) {
    return (
      <main className="bg-cream min-h-screen flex items-center justify-center">
        <Header variant="solid" />
        <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="bg-cream text-charcoal min-h-screen pt-44 pb-24 px-6">
        <Header variant="solid" />
        <div className="max-w-2xl mx-auto text-center">
          <span className="eyebrow text-on-muted">404</span>
          <h1 className="font-display text-5xl mt-5 mb-4">{c.notFoundT}</h1>
          <p className="text-on-muted mb-10">{c.notFoundB}</p>
          <Link href="/blog" className="btn-solid btn-solid-midnight press-98">
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

  const paragraphs = (post.content || "").split("\n").filter((p) => p.trim() !== "");
  const heroImg = post.imageUrl ? getMediaUrl(post.imageUrl) : null;

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant={heroImg ? "transparent-dark" : "solid"} />

      {heroImg ? (
        <section className="relative min-h-[70vh] flex items-end overflow-hidden bg-midnight text-ivory">
          <div className="absolute inset-0 z-0">
            <Image
              src={heroImg}
              alt={post.title}
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
              href="/blog"
              className="inline-flex items-center gap-3 mb-12 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/70 hover:text-champagne transition-colors"
            >
              <Icon name="west" className="text-base" />
              {c.back}
            </Link>
            <div className="flex items-center gap-4 mb-8 opacity-0 animate-fade-up">
              <span className="h-px w-10 bg-champagne" />
              <span className="eyebrow">{c.eyebrow}</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-[4.5rem] text-ivory leading-[1.05] max-w-4xl mb-10 opacity-0 animate-fade-up-slow">
              {post.title}
            </h1>
            <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.28em] text-ivory/65">
              <span><span className="text-ivory/45">{c.by}: </span>{post.author}</span>
              <span className="h-px w-6 bg-ivory/30" />
              <span>{fmt(post.publishedAt)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-cream pt-44 pb-20 border-b border-border">
          <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-14">
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 mb-12 text-[11px] font-semibold uppercase tracking-[0.24em] text-on-muted hover:text-champagne transition-colors"
            >
              <Icon name="west" className="text-base" />
              {c.back}
            </Link>
            <span className="eyebrow text-champagne block mb-5">{c.eyebrow}</span>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-charcoal leading-[1.05] max-w-4xl mb-10">
              {post.title}
            </h1>
            <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.28em] text-on-muted">
              <span><span className="text-on-muted/65">{c.by}: </span><span className="text-charcoal font-semibold">{post.author}</span></span>
              <span className="h-px w-6 bg-border" />
              <span>{fmt(post.publishedAt)}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Body ────────────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-14">
          <div className="prose-editorial">
            {post.summary && (
              <p className="font-display text-2xl md:text-[1.6rem] text-charcoal leading-snug mb-12 not-prose">
                {post.summary}
              </p>
            )}
            {paragraphs.length > 0 ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
              : <p>{post.content}</p>}
          </div>

          <div className="mt-20 pt-10 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <span className="eyebrow-muted">{c.share}</span>
            <ShareBar
              title={post.title}
              summary={post.summary}
              variant="expanded"
            />
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-on-muted hover:text-champagne transition-colors"
            >
              <Icon name="west" className="text-base" />
              {c.back}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
