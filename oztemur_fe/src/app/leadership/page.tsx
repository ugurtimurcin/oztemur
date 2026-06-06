import type { Metadata } from "next";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getPageContent, getUiStrings, pickSection } from "@/lib/server/siteContent";
import Image from "next/image";
import Link from "next/link";
import { getMediaUrl } from "@/lib/api";
import Header from "@/components/Header";
import Icon from "@/components/Icon";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

const HERO_FALLBACK: Record<string, Record<string, string>> = {
  tr: {
    eyebrow: "Yönetim kadrosu",
    line1: "İşin ardındaki",
    line2: "isimler.",
    lead: "Öztemur Group Of Companies yönetim kurulu ve üst düzey ekibi, sektörlerinde uzun yıllar deneyim taşıyan profesyonellerden oluşur.",
  },
  en: {
    eyebrow: "Leadership",
    line1: "The people behind",
    line2: "the work.",
    lead: "Öztemur Group Of Companies' board and senior team comprise professionals with decades of experience in their sectors.",
  },
};

const MEMBERS_HEADING_FALLBACK: Record<string, { eyebrow: string; title: string }> = {
  tr: { eyebrow: "Yönetim kurulu ve üst yönetim", title: "Kadromuz." },
  en: { eyebrow: "Board and senior management", title: "Our team." },
};

interface LeadershipMember {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
}

/**
 * Fetches active leadership members server-side. Cached for 60s so admin
 * edits propagate quickly. Returns an empty array on any failure so the
 * page can hide the section gracefully.
 */
async function fetchLeadership(locale: string): Promise<LeadershipMember[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/cms/leadership?lang=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60, tags: ["leadership", "site-content"] } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) return json.data as LeadershipMember[];
    return [];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const [page, ui] = await Promise.all([
    getPageContent("leadership", locale),
    getUiStrings(locale),
  ]);
  const hero = pickSection(page, "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  return buildMetadata(
    {
      title: ui["page.leadership.title"] ?? "Leadership",
      description: hero.lead,
      path: "/leadership",
    },
    locale,
  );
}

export default async function Page() {
  const locale = await resolveLocale();
  const [page, members] = await Promise.all([
    getPageContent("leadership", locale),
    fetchLeadership(locale),
  ]);
  const hero = pickSection(page, "hero", HERO_FALLBACK[locale] ?? HERO_FALLBACK.en);
  const headings = MEMBERS_HEADING_FALLBACK[locale] ?? MEMBERS_HEADING_FALLBACK.en;
  const hasMembers = members.length > 0;

  return (
    <main className="bg-cream text-charcoal">
      <Header variant="transparent-dark" />

      <section className="relative min-h-[75vh] flex items-end overflow-hidden bg-midnight text-ivory">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight-soft via-midnight to-midnight-deep" />
          <div className="texture-grain absolute inset-0 opacity-25" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pb-24 pt-44">
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-10 bg-champagne" />
            <span className="eyebrow">{hero.eyebrow}</span>
          </div>
          <h1 className="text-display-xl text-ivory mb-10 max-w-4xl">
            {hero.line1}
            <br />
            <span className="italic font-light text-champagne">{hero.line2}</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-ivory/75 font-light leading-relaxed">{hero.lead}</p>
        </div>
      </section>

      {hasMembers && (
        <section className="bg-cream py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
              <div className="lg:col-span-7">
                <span className="eyebrow">{headings.eyebrow}</span>
                <div className="gold-rule mt-5 mb-8" />
                <h2 className="text-display-lg text-charcoal max-w-xl">{headings.title}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {members.map((m) => (
                <Link key={m.id} href={`/leadership/${m.slug || m.id}`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden bg-midnight mb-6 relative">
                    {m.photoUrl ? (
                      <Image
                        src={getMediaUrl(m.photoUrl)}
                        alt={m.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[1100ms] ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ivory/30 bg-gradient-to-br from-midnight-soft to-midnight-deep">
                        <Icon name="person" className="text-6xl" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight/40 via-transparent to-transparent" />
                  </div>
                  <span className="eyebrow text-champagne block mb-2">{m.role}</span>
                  <h3 className="font-display text-2xl text-charcoal leading-snug mb-4 group-hover:text-champagne transition-colors">{m.name}</h3>
                  {m.bio && (
                    <p className="text-on-muted font-light leading-relaxed line-clamp-4 whitespace-pre-line">{m.bio}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
