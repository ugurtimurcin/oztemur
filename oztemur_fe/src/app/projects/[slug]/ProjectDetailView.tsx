"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { getProjectBySlug, type ProjectDto, getMediaUrl } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useAllUiStrings, useSection } from "@/lib/SiteContentContext";
import { projectStatusLabel } from "@/lib/projectStatus";
import Icon from "@/components/Icon";

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    back: "Tüm projelere dön",
    location: "Konum",
    budget: "Bütçe",
    completion: "Hedef tamamlanma",
    summary: "Proje özeti",
    timeline: "Proje takvimi",
    gallery: "Görseller",
    galleryDesc: "Proje görselleri ve detaylar.",
  },
  en: {
    back: "Back to all projects",
    location: "Location",
    budget: "Budget",
    completion: "Target completion",
    summary: "Project summary",
    timeline: "Project timeline",
    gallery: "Gallery",
    galleryDesc: "Project imagery and highlights.",
  },
};

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useLanguage();
  const c = useSection("project_detail", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const uiStrings = useAllUiStrings();

  const getLocal = (field: Record<string, string> | undefined | null) => {
    if (!field) return "";
    return field[locale] || field["en"] || field["tr"] || "";
  };

  useEffect(() => {
    let cancelled = false;
    getProjectBySlug(resolvedParams.slug).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setProject(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [resolvedParams.slug]);

  if (loading) {
    return (
      <main className="bg-cream min-h-screen flex items-center justify-center">
        <Header variant="solid" />
        <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!project) notFound();

  const heroImg = getMediaUrl(project.imageUrl) ||
    "/images/projects-placeholder.webp";

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Cinematic hero ──────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImg}
            alt={getLocal(project.title)}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55 animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
          <div className="texture-grain absolute inset-0 opacity-25 mix-blend-overlay" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-24 pt-44">
          <Link
            href="/projects"
            className="inline-flex items-center gap-3 mb-12 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/70 hover:text-champagne transition-colors"
          >
            <Icon name="west" className="text-base" />
            {c.back}
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-10 opacity-0 animate-fade-up">
            <span className="px-3 py-1.5 bg-cream/95 text-[10px] uppercase tracking-[0.28em] text-charcoal font-semibold">
              {getLocal(project.category) || "Project"}
            </span>
            {project.year && (
              <span className="px-3 py-1.5 border border-ivory/30 text-[10px] uppercase tracking-[0.28em] text-ivory">
                {project.year}
              </span>
            )}
            <span className="flex items-center gap-2 px-3 py-1.5 border border-ivory/20 text-[10px] uppercase tracking-[0.28em] text-ivory/85">
              <span className={`w-1.5 h-1.5 rounded-full ${
                project.status === "Operational" || project.status === "Completed"
                  ? "bg-champagne"
                  : "bg-ivory/50"
              }`} />
              {projectStatusLabel(project.status, uiStrings) || projectStatusLabel("Planning", uiStrings)}
            </span>
          </div>

          <h1 className="text-display-xl text-ivory mb-12 max-w-5xl opacity-0 animate-fade-up-slow">
            {getLocal(project.title)}
          </h1>

          {/* Spec strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 border-t border-ivory/15 pt-8">
            {[
              { label: c.location,   value: getLocal(project.location) || "—" },
              { label: c.budget,     value: getLocal(project.budget) || "—" },
              { label: c.completion, value: project.year || "—" },
            ].map((item) => (
              <div key={item.label}>
                <span className="block text-[10px] uppercase tracking-[0.28em] text-ivory/55 font-semibold mb-2">
                  {item.label}
                </span>
                <span className="font-display text-xl md:text-2xl text-ivory leading-tight">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Summary + timeline ──────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7">
            <span className="eyebrow">{c.summary}</span>
            <div className="gold-rule mt-5 mb-10" />
            <p className="text-on-muted text-lg md:text-xl font-light leading-loose whitespace-pre-line">
              {getLocal(project.longDescription) || getLocal(project.description)}
            </p>
          </div>

          {project.timeline && project.timeline.length > 0 && (
            <div className="lg:col-span-5">
              <span className="eyebrow">{c.timeline}</span>
              <div className="gold-rule mt-5 mb-10" />
              <div className="relative border-l border-border space-y-10 ms-2 ps-2">
                {project.timeline.map((phase, idx) => (
                  <div key={idx} className="relative ps-8">
                    <span className="absolute -start-[7px] top-1 w-3 h-3 bg-champagne border-2 border-cream" />
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-on-muted mb-2">
                      {getLocal(phase.date)}
                    </span>
                    <h4 className="font-display text-xl text-charcoal mb-2 leading-tight">
                      {getLocal(phase.phase)}
                    </h4>
                    <p className="text-sm text-on-muted font-light leading-relaxed">
                      {getLocal(phase.details)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Gallery ─────────────────────────────────── */}
      {project.galleryUrls && project.galleryUrls.length > 0 && (
        <section className="bg-surface py-24 md:py-32 border-t border-border">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <span className="eyebrow">{c.gallery}</span>
                <div className="gold-rule mt-5 mb-6" />
                <h2 className="text-display-md text-charcoal">{getLocal(project.title)}</h2>
              </div>
              <p className="text-on-muted font-light max-w-md">{c.galleryDesc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-8 md:row-span-2 relative aspect-[16/10] md:aspect-auto md:min-h-[480px] overflow-hidden bg-midnight group">
                <Image
                  src={heroImg}
                  alt={`${getLocal(project.title)} hero`}
                  fill
                  sizes="(min-width: 768px) 66vw, 100vw"
                  className="object-cover opacity-95 group-hover:scale-105 transition-transform duration-[1500ms] ease-out"
                />
              </div>
              {project.galleryUrls.slice(0, 4).map((url, idx) => (
                <div
                  key={idx}
                  className={`relative overflow-hidden bg-midnight group ${
                    idx === 0 ? "md:col-span-4 aspect-[4/3]" : "md:col-span-2 aspect-square"
                  }`}
                >
                  <Image
                    src={getMediaUrl(url)}
                    alt={`${getLocal(project.title)} ${idx + 1}`}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover opacity-95 group-hover:scale-105 transition-transform duration-[1500ms] ease-out"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
