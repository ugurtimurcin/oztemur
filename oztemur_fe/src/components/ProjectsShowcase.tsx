"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getFeaturedProjects, getMediaUrl, type ProjectDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useAllUiStrings, useSection } from "@/lib/SiteContentContext";
import { projectStatusLabel } from "@/lib/projectStatus";
import Icon from "@/components/Icon";

const PROJECTS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Öne çıkan projeler",
    title: "Şu an inşa edilen miras",
    intro:
      "Her proje, üzerinde durduğu coğrafyaya kalıcı bir değer bırakmak üzere tasarlanır.",
    cta: "Tüm Projeler",
    explore: "Projeyi İncele",
    empty: "Henüz yayınlanmış proje yok.",
    labelProject: "Proje",
    labelCategory: "Kategori",
    labelLocation: "Konum",
    labelYear: "Yıl",
    labelBudget: "Bütçe",
    labelStatus: "Durum",
  },
  en: {
    eyebrow: "Featured projects",
    title: "A legacy under construction",
    intro:
      "Every project is designed to leave a lasting value on the geography it stands on.",
    cta: "All Projects",
    explore: "View Project",
    empty: "No projects published yet.",
    labelProject: "Project",
    labelCategory: "Category",
    labelLocation: "Location",
    labelYear: "Year",
    labelBudget: "Budget",
    labelStatus: "Status",
  },
};

const STAGE_COUNT = 4;

export default function ProjectsShowcase() {
  const { locale } = useLanguage();
  const c = useSection("home", "projects", PROJECTS_FALLBACK[locale] ?? PROJECTS_FALLBACK.en);
  const uiStrings = useAllUiStrings();

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Featured endpoint enforces the 4-cap server-side and falls back to
    // top-N by DisplayOrder when nothing is marked yet — section never
    // empties on a fresh install.
    getFeaturedProjects(STAGE_COUNT).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setProjects(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const getLocal = (field: Record<string, string> | undefined | null) => {
    if (!field) return "";
    return field[locale] || field["en"] || field["tr"] || "";
  };

  const active = projects[activeIdx];
  const total = projects.length;

  return (
    <section className="relative bg-cream py-24 md:py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        {/* ── Header row: eyebrow + counter + CTA on one architectural line ─ */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16 md:mb-20">
          <div className="md:max-w-2xl">
            <span className="eyebrow">{c.eyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-lg text-charcoal leading-[1.05]">{c.title}</h2>
            <p className="text-on-muted text-base md:text-lg font-light leading-relaxed mt-6 max-w-xl">
              {c.intro}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.32em] text-on-muted/80 font-medium tabular-nums">
              {!loading && active ? `n° ${String(activeIdx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}` : ""}
            </span>
            <Link href="/projects" className="btn-link text-charcoal hover:text-champagne">
              {c.cta}
              <Icon name="arrow_forward" className="text-base arrow" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-32 flex justify-center">
            <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !active ? (
          <div className="py-24 text-center border-y border-border">
            <p className="eyebrow-muted">{c.empty}</p>
          </div>
        ) : (
          <>
            <Brief
              key={active.id}
              project={active}
              uiStrings={uiStrings}
              labels={c}
              getLocal={getLocal}
            />
            <BarNav
              count={total}
              activeIdx={activeIdx}
              onSelect={setActiveIdx}
              projects={projects}
              getLocal={getLocal}
            />
          </>
        )}
      </div>
    </section>
  );
}

// ─── Brief ───────────────────────────────────────
// Image on the left, structured project brief on the right. Imagine a
// printed dossier the contractor hands to a client. Each spec row has a
// dot-leader between label and value — that's what makes it read like a
// blueprint deck, not a marketing card.
function Brief({
  project,
  uiStrings,
  labels,
  getLocal,
}: {
  project: ProjectDto;
  uiStrings: Record<string, string>;
  labels: Record<string, string>;
  getLocal: (field: Record<string, string> | undefined | null) => string;
}) {
  const title = getLocal(project.title);
  const category = getLocal(project.category);
  const location = getLocal(project.location);
  const budget = getLocal(project.budget);
  const description = getLocal(project.description);

  const specRows = [
    { label: labels.labelCategory, value: category || "—" },
    { label: labels.labelLocation, value: location || "—" },
    { label: labels.labelYear,     value: project.year || "—" },
    { label: labels.labelBudget,   value: budget || "—" },
  ].filter(r => r.value !== "—" || r.label === labels.labelYear); // Keep year even if blank for layout balance

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-stretch">
      {/* ── Image panel ──────────────────────────── */}
      <div className="md:col-span-7 relative aspect-[16/10] overflow-hidden bg-midnight">
        <div className="absolute inset-0 animate-fade-in">
          <Image
            src={getMediaUrl(project.imageUrl) || "/images/projects-placeholder.webp"}
            alt={title}
            fill
            priority
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover animate-ken-burns"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-midnight/30 via-transparent to-transparent" />
        <div className="texture-grain absolute inset-0 opacity-12 mix-blend-overlay" />

        {/* Corner registration marks — subtle blueprint tic */}
        <div className="absolute top-4 left-4 w-4 h-4 border-l border-t border-ivory/40" />
        <div className="absolute top-4 right-4 w-4 h-4 border-r border-t border-ivory/40" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-l border-b border-ivory/40" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-r border-b border-ivory/40" />
      </div>

      {/* ── Project brief panel ─────────────────────── */}
      {/* Dark emerald slab — the contractor's dossier cover. High-contrast
          ivory on midnight reads cleanly regardless of what colours the
          image carries. Generous padding mimics a presentation board. */}
      <div className="md:col-span-5 bg-midnight text-ivory flex flex-col justify-between p-8 md:p-10 lg:p-12 min-h-[420px] md:min-h-[500px] relative overflow-hidden">
        {/* Subtle grain so the slab doesn't read as flat web rectangle */}
        <div className="texture-grain absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" />

        <div className="relative">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-5 animate-fade-up opacity-0">
            <span className="text-[10px] uppercase tracking-[0.32em] text-champagne font-medium">
              {labels.labelProject}
            </span>
            <span className="h-px flex-1 bg-ivory/20" />
          </div>

          {/* Project name — generous serif, sized to fit the slab without
              wrapping into the image. Long titles will still wrap inside
              this column; clamp keeps them readable rather than oversized. */}
          <h3 className="font-display text-ivory leading-[1.02] tracking-tight text-[clamp(1.75rem,3.2vw,2.75rem)] mb-6 animate-fade-up opacity-0" style={{ animationDelay: "80ms" }}>
            {title}
          </h3>

          {/* Editorial dek — short prose pull, sets the tone before the
              hard data underneath. Hidden when the project has no
              description so the slab doesn't show an awkward empty block. */}
          {description && (
            <p
              className="text-ivory/65 text-sm md:text-base font-light leading-relaxed line-clamp-3 mb-10 animate-fade-up opacity-0"
              style={{ animationDelay: "140ms" }}
            >
              {description}
            </p>
          )}

          {/* Spec rows — label · · · · · value (dotted leader, ivory/30) */}
          <dl className="space-y-4">
            {specRows.map((row, idx) => (
              <div
                key={row.label}
                className="flex items-baseline gap-3 animate-fade-up opacity-0"
                style={{ animationDelay: `${200 + idx * 80}ms` }}
              >
                <dt className="text-[10px] uppercase tracking-[0.32em] text-champagne font-medium whitespace-nowrap">
                  {row.label}
                </dt>
                <span
                  className="flex-1 h-px self-end mb-[6px] border-b border-dotted border-ivory/25"
                  aria-hidden
                />
                <dd className="text-ivory text-sm md:text-base font-medium tabular-nums text-right whitespace-nowrap max-w-[60%] truncate">
                  {row.value}
                </dd>
              </div>
            ))}

            {/* Status — distinct treatment with live dot */}
            <div
              className="flex items-baseline gap-3 animate-fade-up opacity-0"
              style={{ animationDelay: `${200 + specRows.length * 80}ms` }}
            >
              <dt className="text-[10px] uppercase tracking-[0.32em] text-champagne font-medium whitespace-nowrap">
                {labels.labelStatus}
              </dt>
              <span className="flex-1 h-px self-end mb-[6px] border-b border-dotted border-ivory/25" aria-hidden />
              <dd className="flex items-center gap-2 text-sm md:text-base font-medium whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  project.status === "Operational" || project.status === "Completed"
                    ? "bg-champagne"
                    : project.status === "InProgress"
                      ? "bg-ivory"
                      : "bg-ivory/40"
                }`} />
                <span className="text-ivory">
                  {projectStatusLabel(project.status, uiStrings)}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* CTA — bracketed, blueprint-tag feel, sits on the dossier slab */}
        <div className="mt-10 relative animate-fade-up opacity-0" style={{ animationDelay: "640ms" }}>
          <Link
            href={`/projects/${project.slug || project.id}`}
            className="group inline-flex items-center gap-4 px-6 py-4 border border-ivory/40 text-[11px] font-semibold uppercase tracking-[0.32em] text-ivory hover:bg-champagne hover:border-champagne hover:text-midnight transition-colors duration-500"
          >
            <span aria-hidden className="text-champagne group-hover:text-midnight transition-colors duration-500">[</span>
            {labels.explore}
            <Icon name="arrow_forward" className="text-base group-hover:translate-x-2 transition-transform duration-500" />
            <span aria-hidden className="text-champagne group-hover:text-midnight transition-colors duration-500">]</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Bar nav ─────────────────────────────────────
// Horizontal bars instead of numbered dots — reads like the spine of a
// construction phase chart. Each bar shows the project's title on hover,
// flips to champagne when active. Click to swap the brief above.
function BarNav({
  count,
  activeIdx,
  onSelect,
  projects,
  getLocal,
}: {
  count: number;
  activeIdx: number;
  onSelect: (i: number) => void;
  projects: ProjectDto[];
  getLocal: (field: Record<string, string> | undefined | null) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const previewIdx = hovered ?? activeIdx;
  const preview = projects[previewIdx];

  return (
    <div className="mt-16 md:mt-20 border-t border-border pt-8">
      {/* Top row: hovered/active project title peek */}
      <div className="flex items-baseline justify-between mb-5 min-h-[24px]">
        <span className="text-[10px] uppercase tracking-[0.32em] text-on-muted/80 font-medium tabular-nums">
          n° {String(previewIdx + 1).padStart(2, "0")}
        </span>
        <span className="font-display text-charcoal text-base md:text-lg leading-tight text-right truncate ms-6">
          {preview ? getLocal(preview.title) : ""}
        </span>
      </div>

      {/* The bars themselves */}
      <div className="flex items-center gap-2 md:gap-3">
        {Array.from({ length: count }).map((_, idx) => {
          const isActive = idx === activeIdx;
          const isHovered = idx === hovered;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`${getLocal(projects[idx]?.title) || `Project ${idx + 1}`}`}
              aria-current={isActive ? "true" : undefined}
              className="group relative flex-1 py-3 focus:outline-none"
            >
              {/* Track */}
              <span className={`block h-[3px] transition-colors duration-500 ${
                isActive
                  ? "bg-champagne"
                  : isHovered
                    ? "bg-charcoal/50"
                    : "bg-border"
              }`} />
              {/* Number under the bar — only visible for active, muted for others */}
              <span
                className={`absolute left-0 top-full mt-2 text-[10px] tracking-[0.24em] tabular-nums transition-colors duration-500 ${
                  isActive ? "text-charcoal font-medium" : "text-on-muted/50 group-hover:text-on-muted"
                }`}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      
    </div>
  );
}
