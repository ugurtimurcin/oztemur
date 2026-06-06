"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";
import Icon from "@/components/Icon";

const NOT_FOUND_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    code: "404",
    title: "Aradığınız sayfa bulunamadı.",
    body: "Bağlantı kırılmış veya sayfa kaldırılmış olabilir. Anasayfaya dönebilir ya da grubumuzu keşfedebilirsiniz.",
    primary: "Anasayfa",
    secondary: "Grubu Keşfet",
  },
  en: {
    code: "404",
    title: "We couldn't find that page.",
    body: "The link may be broken or the page may have moved. You can return to the homepage or explore the group.",
    primary: "Home",
    secondary: "Discover the Group",
  },
};

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const { locale } = useLanguage();
  const c = useSection("not_found", "main", NOT_FOUND_FALLBACK[locale] ?? NOT_FOUND_FALLBACK.en);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <main className="bg-midnight text-ivory min-h-screen relative overflow-hidden flex flex-col">
      <Header variant="transparent-dark" />

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-soft via-midnight to-midnight-deep" />
        <div className="texture-grain absolute inset-0 opacity-25" />
        <div className="pattern-dots absolute inset-0 opacity-50" />
      </div>

      <div className="relative flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 md:px-10 lg:px-14 py-32">
        <span className="font-display text-[10rem] md:text-[16rem] leading-[0.8] text-champagne/20 mb-12 select-none">
          {c.code}
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end border-t border-ivory/10 pt-12">
          <div className="lg:col-span-7">
            <span className="eyebrow text-champagne block mb-5">{c.code}</span>
            <h1 className="font-display text-3xl md:text-5xl text-ivory leading-tight mb-6">
              {c.title}
            </h1>
            <p className="text-ivory/65 font-light text-lg leading-relaxed max-w-xl">
              {c.body}
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-4 lg:items-end">
            <Link href="/" className="btn-solid btn-solid-gold press-98">
              {c.primary}
              <Icon name="arrow_forward" className="text-base" />
            </Link>
            <Link href="/companies" className="btn-outline-ivory press-98 inline-flex items-center justify-center gap-3">
              {c.secondary}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
