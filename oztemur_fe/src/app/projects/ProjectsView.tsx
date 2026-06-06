"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Pagination from "@/components/Pagination";
import { getProjects, getProjectCategories, getMediaUrl, type ProjectDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useAllUiStrings, useSection } from "@/lib/SiteContentContext";
import { projectStatusLabel } from "@/lib/projectStatus";
import Icon from "@/components/Icon";

const PAGE_SIZE = 12;
const ALL = "__all__";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Projeler",
    line1: "İz bırakan",
    line2: "eserler.",
    lead: "Bugünün ihtiyaçlarına cevap verirken yarınlara değer üreten projeler tasarlıyor ve hayata geçiriyoruz.",
  },
  en: {
    eyebrow: "Projects",
    line1: "Work that",
    line2: "endures.",
    lead: "We design and deliver projects that meet today's needs while creating durable value for tomorrow.",
  },
};

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    all: "Tümü",
    loading: "Yükleniyor",
    empty: "Henüz yayınlanmış proje yok.",
    explore: "İncele",
    sectorsHead: "Kategoriler",
    paginationPrev: "Önceki",
    paginationNext: "Sonraki",
    paginationPage: "Sayfa",
    paginationOf: "/",
  },
  en: {
    all: "All",
    loading: "Loading",
    empty: "No projects published yet.",
    explore: "Explore",
    sectorsHead: "Categories",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationPage: "Page",
    paginationOf: "of",
  },
};

export default function ProjectsPage() {
  const { locale } = useLanguage();
  const hero = useSection("projects", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const labels = useSection("projects", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const uiStrings = useAllUiStrings();

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Categories are language-specific (localized strings), so we refetch when
  // the locale changes. The list also doubles as the filter rail.
  useEffect(() => {
    let cancelled = false;
    getProjectCategories(locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setCategories(res.data);
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Reset page + category on locale change. Otherwise a category string that
  // doesn't exist in the new locale's set would silently produce an empty list.
  useEffect(() => { setPage(1); setActiveCategory(ALL); }, [locale]);
  useEffect(() => { setPage(1); }, [activeCategory]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjects(page, PAGE_SIZE, locale, activeCategory === ALL ? undefined : activeCategory).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setProjects(res.data.items);
        setTotalCount(res.data.totalCount);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locale, page, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const getLocal = (field: Record<string, string> | undefined | null) => {
    if (!field) return "";
    return field[locale] || field["en"] || field["tr"] || "";
  };

  const handlePageChange = (next: number) => {
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <Image
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40 animate-ken-burns"
            src="/images/projects-hero.webp"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-midnight/30" />
          <div className="texture-grain absolute inset-0 opacity-25 mix-blend-overlay" />
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
      {categories.length > 0 && (
        <section className="bg-cream border-b border-border sticky top-[72px] md:top-[80px] z-20 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-5 flex items-center gap-6">
            <span className="eyebrow-muted hidden md:inline">{labels.sectorsHead}</span>
            <span className="hidden md:inline-block h-px w-8 bg-border" />
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0 flex-1">
              <button
                onClick={() => setActiveCategory(ALL)}
                className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] border transition-all ${
                  activeCategory === ALL
                    ? "border-charcoal bg-charcoal text-cream"
                    : "border-border text-on-muted hover:border-charcoal hover:text-charcoal"
                }`}
              >
                {labels.all}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] border transition-all ${
                    activeCategory === cat
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-border text-on-muted hover:border-charcoal hover:text-charcoal"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <span className="hidden md:inline text-[11px] tabular-nums text-on-muted">
              {String(totalCount).padStart(2, "0")}
            </span>
          </div>
        </section>
      )}

      {/* ── Grid ────────────────────────────────────── */}
      <section ref={gridRef} className="bg-cream py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          {loading ? (
            <div className="py-32 flex justify-center">
              <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-32 text-center border-y border-border">
              <p className="eyebrow-muted">{labels.empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug || p.id}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-midnight mb-6">
                    <Image
                      src={
                        getMediaUrl(p.imageUrl) ||
                        "/images/projects-placeholder.webp"
                      }
                      alt={getLocal(p.title)}
                      fill
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1100ms] ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight/70 via-transparent to-transparent" />
                    <div className="absolute top-5 start-5 flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-cream/95 backdrop-blur text-[10px] uppercase tracking-[0.28em] text-charcoal font-semibold">
                        {getLocal(p.category) || hero.eyebrow}
                      </span>
                      {p.year && (
                        <span className="px-3 py-1.5 border border-ivory/40 text-[10px] uppercase tracking-[0.28em] text-ivory">
                          {p.year}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-5 start-5 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        p.status === "Operational" || p.status === "Completed" ? "bg-champagne" : "bg-ivory/60"
                      }`} />
                      <span className="text-[10px] uppercase tracking-[0.28em] text-ivory/80 font-medium">
                        {projectStatusLabel(p.status, uiStrings)}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display text-2xl md:text-[1.7rem] text-charcoal leading-snug mb-3 group-hover:text-champagne-dim transition-colors">
                    {getLocal(p.title)}
                  </h3>
                  <p className="text-on-muted font-light leading-relaxed line-clamp-2 mb-5 whitespace-pre-line">
                    {getLocal(p.description)}
                  </p>
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 self-start group-hover:border-champagne group-hover:text-champagne transition-colors">
                    {labels.explore}
                    <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>
              ))}
            </div>
          )}
          {!loading && projects.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              labels={{ previous: labels.paginationPrev, next: labels.paginationNext, page: labels.paginationPage, of: labels.paginationOf }}
            />
          )}
        </div>
      </section>
    </main>
  );
}
