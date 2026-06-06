"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useSection } from "@/lib/SiteContentContext";

const AT_A_GLANCE_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Bir bakışta",
    title: "Sayılarla Öztemur Group Of Companies",
    intro:
      "Dört on yıla yaklaşan bir kurumsal birikim, çok sayıda iş kolu ve onlarca markanın oluşturduğu bütüncül bir yapı.",
    item1_value: "40", item1_suffix: "+", item1_label: "Yıllık Tecrübe",
    item2_value: "12", item2_suffix: "",  item2_label: "Grup Şirketi",
    item3_value: "5",  item3_suffix: "",  item3_label: "Faaliyet Sektörü",
    item4_value: "500", item4_suffix: "+", item4_label: "Çalışan",
  },
  en: {
    eyebrow: "At a glance",
    title: "Öztemur Group Of Companies in numbers",
    intro:
      "Almost four decades of corporate craft, multiple business lines and a portfolio of brands organised under one disciplined structure.",
    item1_value: "40", item1_suffix: "+", item1_label: "Years of experience",
    item2_value: "12", item2_suffix: "",  item2_label: "Group companies",
    item3_value: "5",  item3_suffix: "",  item3_label: "Sectors of activity",
    item4_value: "500", item4_suffix: "+", item4_label: "People employed",
  },
};

function parseIntSafe(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function Counter({ end, suffix }: { end: number; suffix: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame: number;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const start = performance.now();
          const dur = 1800;
          const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(2, -10 * p);
            setVal(Math.floor(ease * end));
            if (p < 1) frame = requestAnimationFrame(tick);
            else setVal(end);
          };
          frame = requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [end]);

  return (
    <span ref={ref} className="font-display text-6xl md:text-7xl text-champagne tabular-nums tracking-tight">
      {val}
      {suffix}
    </span>
  );
}

export default function GroupAtGlance() {
  const { locale } = useLanguage();
  const c = useSection("home", "at_a_glance", AT_A_GLANCE_FALLBACK[locale] ?? AT_A_GLANCE_FALLBACK.en);
  const items = [1, 2, 3, 4].map(i => ({
    value: parseIntSafe(c[`item${i}_value`] ?? "0"),
    suffix: c[`item${i}_suffix`] ?? "",
    label: c[`item${i}_label`] ?? "",
  }));

  return (
    <section className="relative bg-midnight text-ivory py-24 md:py-32 overflow-hidden">
      <div className="texture-grain absolute inset-0 opacity-15 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-4">
            <span className="eyebrow">{c.eyebrow}</span>
            <div className="gold-rule mt-5 mb-8" />
            <h2 className="text-display-md text-ivory">{c.title}</h2>
          </div>
          <p className="lg:col-span-7 lg:col-start-6 text-ivory/65 text-lg font-light leading-relaxed self-end">
            {c.intro}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-ivory/10">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`py-12 lg:py-14 ${idx > 0 ? "lg:border-l border-ivory/10" : ""} ${
                idx % 2 === 1 ? "border-l border-ivory/10 lg:border-l" : ""
              } ${idx >= 2 ? "border-t border-ivory/10 lg:border-t-0" : ""} px-2 lg:px-8`}
            >
              <Counter end={item.value} suffix={item.suffix} />
              <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-ivory/55 font-medium">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
