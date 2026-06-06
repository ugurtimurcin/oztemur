"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HeroMedia from "@/components/HeroMedia";
import { getJobs, type JobRequisitionDto } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    heroMedia: "",
    heroMediaActive: "false",
    eyebrow: "Kariyer",
    line1: "Kalıcı işler yapmak",
    line2: "isteyenlerle.",
    lead: "Öztemur Group Of Companies bünyesinde yer alan şirketlerde işine sahip çıkan, uzun vadeli düşünen ve kaliteden ödün vermeyen ekipler kuruyoruz.",
    cta: "Açık Pozisyonlar",
  },
  en: {
    heroMedia: "",
    heroMediaActive: "false",
    eyebrow: "Careers",
    line1: "For people who",
    line2: "want to build things that last.",
    lead: "Across the Öztemur Group Of Companies companies we are building teams that take ownership, think long-term and refuse to compromise on quality.",
    cta: "Open Positions",
  },
};

const VALUES_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    valuesEyebrow: "Çalışma kültürümüz",
    valuesTitle: "Standartları biz belirleriz, ödün vermeyiz.",
    value1_no: "01", value1_title: "Sahiplik",
    value1_body: "Burada her ekibin kendi alanında karar verme yetkisi vardır. Yapılan işin sahibi, onu yapan kişidir.",
    value2_no: "02", value2_title: "Kalite",
    value2_body: "Bir işi 'iyi' yapmak yetmez. Yıllar sonra bakıldığında utandırmayacak bir iş yapmak gerekir.",
    value3_no: "03", value3_title: "Süreklilik",
    value3_body: "Hızlı kazanç için kısa kararlar almayız. Bir sonraki nesle bırakmak istediğimiz bir kurum kuruyoruz.",
  },
  en: {
    valuesEyebrow: "How we work",
    valuesTitle: "We set our own standards. We don't lower them.",
    value1_no: "01", value1_title: "Ownership",
    value1_body: "Every team here is empowered to make decisions in its area. The person doing the work is the person responsible for it.",
    value2_no: "02", value2_title: "Craft",
    value2_body: "Doing something well is not enough. We aim to do work we will not be embarrassed to look back on years later.",
    value3_no: "03", value3_title: "Continuity",
    value3_body: "We do not chase short wins. We are building an institution we want to hand over to the next generation.",
  },
};

const LABELS_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    rolesEyebrow: "Açık pozisyonlar",
    rolesTitle: "Şu an aradığımız ekip arkadaşları",
    all: "Tüm Departmanlar",
    loading: "Yükleniyor",
    none: "Şu an açık pozisyon bulunmuyor.",
    apply: "Detay & Başvuru",
  },
  en: {
    rolesEyebrow: "Open roles",
    rolesTitle: "People we are looking for right now",
    all: "All Departments",
    loading: "Loading",
    none: "No open positions at the moment.",
    apply: "View & Apply",
  },
};

export default function CareersPage() {
  const { locale } = useLanguage();
  const hero = useSection("careers", "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const valuesSec = useSection("careers", "values", VALUES_FALLBACK[locale] ?? VALUES_FALLBACK.en);
  const labels = useSection("careers", "labels", LABELS_FALLBACK[locale] ?? LABELS_FALLBACK.en);
  const cultureValues = [1, 2, 3].map(i => ({
    no: valuesSec[`value${i}_no`] ?? "",
    title: valuesSec[`value${i}_title`] ?? "",
    body: valuesSec[`value${i}_body`] ?? "",
  }));

  const [jobs, setJobs] = useState<JobRequisitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDept, setActiveDept] = useState("__all__");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getJobs(1, 30, locale).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setJobs(res.data.items);
      else setError(res.message || "Failed to load positions.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locale]);

  const departments = Array.from(new Set(jobs.map((j) => j.department))).filter(Boolean);
  const filtered = activeDept === "__all__" ? jobs : jobs.filter((j) => j.department === activeDept);

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="transparent-dark" />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[78vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          {/* Fallback image (used when admin has not activated a custom media). */}
          <Image
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45 animate-ken-burns"
            src="/images/careers-hero.webp"
          />
          {/* Admin-managed media — overlays the fallback when active. */}
          <HeroMedia src={hero.heroMedia} active={hero.heroMediaActive} overlay={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/20" />
          <div className="texture-grain absolute inset-0 opacity-25 mix-blend-overlay" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-24 pt-44">
          <div className="flex items-center gap-4 mb-10 opacity-0 animate-fade-up">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1 className="text-display-xl text-ivory mb-10 max-w-4xl opacity-0 animate-fade-up-slow">
            {hero.line1}
            <br />
            <span className="italic font-light text-champagne">{hero.line2}</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed mb-10 opacity-0 animate-fade-up-slow">
            {hero.lead}
          </p>
          <a href="#open-roles" className="btn-solid btn-solid-gold press-98">
            {hero.cta}
            <Icon name="south" className="text-base" />
          </a>
        </div>
      </section>

      {/* ── Values ──────────────────────────────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 md:mb-20">
            <div className="lg:col-span-7">
              <span className="eyebrow">{valuesSec.valuesEyebrow}</span>
              <div className="gold-rule mt-5 mb-8" />
              <h2 className="text-display-lg text-charcoal max-w-2xl">{valuesSec.valuesTitle}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {cultureValues.map((v) => (
              <div key={v.no} className="bg-surface p-10 md:p-12 group">
                <div className="flex items-baseline justify-between mb-10">
                  <span className="font-display text-5xl text-champagne">{v.no}</span>
                  <span className="h-px w-16 bg-border group-hover:bg-champagne transition-colors duration-500" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-charcoal mb-5">{v.title}</h3>
                <p className="text-on-muted font-light leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open roles ──────────────────────────────── */}
      <section id="open-roles" className="bg-surface py-24 md:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-12">
            <div>
              <span className="eyebrow">{labels.rolesEyebrow}</span>
              <div className="gold-rule mt-5 mb-6" />
              <h2 className="text-display-md text-charcoal max-w-2xl">{labels.rolesTitle}</h2>
            </div>

            {departments.length > 0 && (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 lg:pb-0">
                <button
                  onClick={() => setActiveDept("__all__")}
                  className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] border transition-all ${
                    activeDept === "__all__"
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-border text-on-muted hover:border-charcoal hover:text-charcoal"
                  }`}
                >
                  {labels.all}
                </button>
                {departments.map((dep) => (
                  <button
                    key={dep}
                    onClick={() => setActiveDept(dep)}
                    className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] border transition-all ${
                      activeDept === dep
                        ? "border-charcoal bg-charcoal text-cream"
                        : "border-border text-on-muted hover:border-charcoal hover:text-charcoal"
                    }`}
                  >
                    {dep}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border border-champagne border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-on-muted">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center border-y border-border">
              <p className="eyebrow-muted">{labels.none}</p>
            </div>
          ) : (
            <div className="border-y border-border divide-y divide-border">
              {filtered.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.id}`}
                  className="group flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-8 md:py-10 px-2 lg:px-6 -mx-2 lg:-mx-6 hover:bg-surface-muted/40 transition-colors"
                >
                  <div className="flex-1 max-w-2xl">
                    <h3 className="font-display text-2xl md:text-[1.7rem] text-charcoal leading-snug mb-3 group-hover:text-champagne-dim transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-charcoal font-semibold">
                        {job.department}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-on-muted/40" />
                      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.28em] text-on-muted font-medium">
                        <Icon name="location_on" className="text-[14px]" />
                        {job.location}
                      </span>
                      {job.type && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-on-muted/40" />
                          <span className="text-[11px] uppercase tracking-[0.28em] text-on-muted font-medium">
                            {job.type}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-charcoal pb-1.5 border-b border-charcoal/30 self-start lg:self-auto group-hover:border-champagne group-hover:text-champagne transition-colors">
                    {labels.apply}
                    <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
