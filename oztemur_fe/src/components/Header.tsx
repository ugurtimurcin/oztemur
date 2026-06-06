"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useUiStrings } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

type Theme = "transparent-dark" | "transparent-light" | "solid";

const NAV_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    "nav.about":     "Hakkımızda",
    "nav.companies": "Şirketler",
    "nav.projects":  "Projeler",
    "nav.news":      "Haberler",
    "nav.blog":      "İçgörüler",
    "nav.careers":   "Kariyer",
    "nav.contact":   "İletişim",
    "nav.home":      "Anasayfa",
  },
  en: {
    "nav.about":     "About",
    "nav.companies": "Companies",
    "nav.projects":  "Projects",
    "nav.news":      "Newsroom",
    "nav.blog":      "Insights",
    "nav.careers":   "Careers",
    "nav.contact":   "Contact",
    "nav.home":      "Home",
  },
};

/**
 * Premium holding-style header.
 * Variants: starts transparent over a dark hero, switches to glass on scroll.
 * Pass `variant="solid"` on pages without a dark hero (legacy `theme="light"`).
 */
export default function Header({
  theme,
  variant,
}: {
  theme?: "dark" | "light";
  variant?: Theme;
}) {
  // Backwards-compat with old theme prop
  const initialVariant: Theme =
    variant ??
    (theme === "light" ? "solid" : "transparent-dark");

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const { locale, setLocale, languages, currentLang } = useLanguage();
  const labels = useUiStrings(NAV_FALLBACK[locale] ?? NAV_FALLBACK.en);
  const t = (key: string) => labels[`nav.${key}`] ?? key;

  // Track scroll for the glass-blur transition only. We deliberately
  // do NOT retract the header on scroll — page-level sticky bars
  // (e.g. /companies sector filter) anchor below it, so the nav must
  // stay anchored at top:0 for the page to render correctly.
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { key: "about",     link: "/about" },
    { key: "companies", link: "/companies" },
    { key: "projects",  link: "/projects" },
    { key: "news",      link: "/news" },
    { key: "blog",      link: "/blog" },
    { key: "careers",   link: "/careers" },
  ];

  // Resolve color tokens based on variant + scroll state
  const isOverlay = initialVariant !== "solid" && !isScrolled;
  const overlayLight = initialVariant === "transparent-light";

  // Background is light whenever: page has scrolled (glass on cream),
  // header is rendering its solid variant (cream), or overlay is over
  // a light hero. Only the dark-hero overlay keeps the text light.
  const isLightBg = isScrolled || initialVariant === "solid" || overlayLight;

  const navTextClass = isScrolled
    ? "text-charcoal"
    : isLightBg
      ? "text-charcoal/85"
      : "text-ivory/85";

  const subTextClass = isLightBg
    ? "text-charcoal/55"
    : "text-ivory/55";

  const wrapperClass = isScrolled
    ? "bg-cream/85 backdrop-blur-xl border-b border-border/60 py-4"
    : initialVariant === "solid"
      ? "bg-cream border-b border-border/60 py-5"
      : "bg-transparent py-7";

  return (
    <>
      <nav
        className={`fixed top-0 start-0 end-0 z-[100] transition-[background-color,backdrop-filter,border-color,padding] duration-500 ease-out flex justify-between items-center px-6 md:px-10 lg:px-14 ${wrapperClass}`}
      >
        {/* ── Brand ───────────────────────────────────── */}
        <Link href="/" className="group flex items-center gap-3.5 select-none">
          <Image
            src="/images/oztemur-logo.png"
            alt="Öztemur"
            width={200}
            height={60}
            priority
            className="h-10 md:h-12 w-auto object-contain transition-opacity duration-500"
          />
          <div className="flex flex-col items-center leading-none">
            <span
              className={`font-display text-lg md:text-xl tracking-wide transition-colors duration-500 ${
                isOverlay && !overlayLight ? "text-ivory" : "text-charcoal"
              }`}
            >
              ÖZTEMUR
            </span>
            <span
              className={`text-[9px] font-semibold tracking-[0.32em] mt-1 transition-colors duration-500 ${subTextClass}`}
            >
              GROUP OF COMPANIES
            </span>
          </div>
        </Link>

        {/* ── Desktop nav ─────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-9">
          {navLinks.map((item) => {
            const active = pathname === item.link || pathname.startsWith(item.link + "/");
            return (
              <Link
                key={item.key}
                href={item.link}
                className={`relative font-sans text-[12px] tracking-[0.2em] uppercase font-medium ${navTextClass} hover:text-champagne transition-colors duration-300 group py-2`}
              >
                {t(item.key)}
                <span
                  className={`absolute -bottom-0.5 start-0 h-px bg-champagne transition-all duration-500 ease-out ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* ── Desktop actions ─────────────────────────── */}
        <div className="hidden lg:flex items-center gap-5">
          {/* Language switcher */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-300 border ${
                isOverlay && !overlayLight
                  ? "border-ivory/25 text-ivory/80 hover:border-champagne hover:text-champagne"
                  : "border-charcoal/15 text-charcoal/75 hover:border-champagne hover:text-champagne"
              }`}
            >
              <span>{currentLang.code.toUpperCase()}</span>
              <Icon name="expand_more" className={`text-[14px] transition-transform duration-300 ${langDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <div
              className={`absolute end-0 top-full mt-2 bg-surface border border-border min-w-[200px] overflow-hidden transition-all duration-300 origin-top-right shadow-[0_24px_60px_rgba(10,26,47,0.12)] ${
                langDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLocale(lang.code);
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-start transition-colors duration-200 ${
                    locale === lang.code
                      ? "bg-surface-muted text-charcoal"
                      : "text-on-muted hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex flex-col" lang={lang.code}>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-charcoal">
                      {lang.nativeName}
                    </span>
                    <span className="text-[10px] text-on-muted/70">{lang.name}</span>
                  </div>
                  {locale === lang.code && (
                    <Icon name="check" className="text-champagne ms-auto text-base" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/contact"
            className={`group inline-flex items-center gap-3 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] transition-all duration-400 ${
              isOverlay && !overlayLight
                ? "bg-champagne text-midnight hover:bg-champagne-bright"
                : "bg-midnight text-ivory hover:bg-midnight-soft"
            }`}
          >
            {t("contact")}
            <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* ── Mobile hamburger ────────────────────────── */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className={`lg:hidden flex flex-col justify-center items-end w-10 h-10 gap-1.5 z-[101] ${
            isOverlay && !overlayLight ? "text-ivory" : "text-charcoal"
          }`}
        >
          <span className="block w-6 h-px bg-current" />
          <span className="block w-4 h-px bg-current" />
        </button>
      </nav>

      {/* ── Fullscreen mobile overlay ─────────────────── */}
      <div
        className={`fixed inset-0 z-[200] bg-midnight text-ivory flex flex-col transition-all duration-[600ms] ease-[cubic-bezier(0.87,0,0.13,1)] ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="texture-grain absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative flex justify-between items-center p-6 md:p-8 border-b border-ivory/10">
          <div className="flex items-center gap-3 select-none">
            <Image src="/images/oztemur-logo.png" alt="Öztemur" width={200} height={60} className="h-10 w-auto object-contain" />
            <div className="flex flex-col items-center leading-none">
              <span className="font-display text-lg tracking-wide text-ivory">ÖZTEMUR</span>
              <span className="text-[9px] font-semibold tracking-[0.32em] mt-1 text-ivory/55">GROUP OF COMPANIES</span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="w-11 h-11 border border-ivory/25 flex items-center justify-center hover:border-champagne hover:text-champagne transition-colors"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>

        <div className="relative flex-1 flex flex-col justify-center px-8 md:px-12 gap-6">
          {[{ key: "home", link: "/" }, ...navLinks].map((item, i) => (
            <div key={item.key} className="overflow-hidden">
              <Link
                href={item.link}
                onClick={() => setMobileMenuOpen(false)}
                className={`block font-display text-4xl sm:text-5xl md:text-6xl text-ivory hover:text-champagne transition-all duration-500 ease-out ${
                  mobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                }`}
                style={{ transitionDelay: `${i * 60 + 200}ms` }}
              >
                {t(item.key)}
              </Link>
            </div>
          ))}

          {/* Mobile language — horizontally scrollable when more than a few langs */}
          <div
            className={`flex gap-3 mt-6 overflow-x-auto hide-scrollbar -mx-8 px-8 md:-mx-12 md:px-12 transition-all duration-500 ease-out ${
              mobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: `${(navLinks.length + 1) * 60 + 200}ms` }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLocale(lang.code)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 border whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] transition-all ${
                  locale === lang.code
                    ? "border-champagne text-champagne bg-champagne/5"
                    : "border-ivory/20 text-ivory/60 hover:border-ivory/40 hover:text-ivory"
                }`}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>

          <div
            className={`mt-6 transition-all duration-500 ease-out ${
              mobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: `${(navLinks.length + 2) * 60 + 200}ms` }}
          >
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center gap-3 bg-champagne text-midnight px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] hover:bg-champagne-bright transition-colors"
            >
              {t("contact")}
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </div>
        </div>

        <div className="relative p-6 md:p-10 border-t border-ivory/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-ivory/40">
          <span>Öztemur Group Of Companies · {new Date().getFullYear()}</span>
          <span>A Family of Companies</span>
        </div>
      </div>
    </>
  );
}
