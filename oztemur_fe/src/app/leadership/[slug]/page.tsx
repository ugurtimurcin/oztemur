import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/lib/server/locale";
import { buildMetadata } from "@/lib/server/metadata";
import { getUiStrings } from "@/lib/server/siteContent";
import { getMediaUrl } from "@/lib/api";
import { safeExternalUrl } from "@/lib/url";
import Header from "@/components/Header";
import Icon from "@/components/Icon";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

interface LeadershipMember {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
}

/**
 * Fetches a single active leadership member by slug. Cached for 60s and
 * tagged so an admin edit propagates quickly. Returns null on any failure so
 * the page can fall through to notFound().
 */
async function fetchMember(slug: string, locale: string): Promise<LeadershipMember | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/cms/leadership/slug/${encodeURIComponent(slug)}?lang=${encodeURIComponent(locale)}`,
      { next: { revalidate: 60, tags: ["leadership", "site-content"] } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json.data) return json.data as LeadershipMember;
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocale();
  const member = await fetchMember(slug, locale);
  if (!member) {
    const ui = await getUiStrings(locale);
    return buildMetadata(
      { title: ui["notfound.leadership.title"] ?? "Not found", description: "", path: `/leadership/${slug}` },
      locale,
    );
  }
  return buildMetadata(
    {
      title: `${member.name} — ${member.role}`,
      description: (member.bio || member.role).replace(/\s+/g, " ").slice(0, 160),
      path: `/leadership/${slug}`,
      type: "article",
    },
    locale,
  );
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = await resolveLocale();
  const member = await fetchMember(slug, locale);
  if (!member) notFound();

  const ui = await getUiStrings(locale);
  const backLabel = ui["leadership.detail.back"] ?? "Back to leadership";
  const paragraphs = (member.bio || "").split("\n").map(s => s.trim()).filter(Boolean);

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      <Header variant="solid" />

      <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 pt-36 md:pt-44 pb-24 md:pb-32">
        <Link
          href="/leadership"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-on-muted hover:text-champagne transition-colors mb-12"
        >
          <Icon name="west" className="text-base" />
          {backLabel}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Portrait */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden bg-midnight">
              {member.photoUrl ? (
                <Image
                  src={getMediaUrl(member.photoUrl)}
                  alt={member.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ivory/30 bg-gradient-to-br from-midnight-soft to-midnight-deep">
                  <Icon name="person" className="text-6xl" />
                </div>
              )}
            </div>

            {(member.email || member.phone || member.linkedInUrl) && (
              <ul className="mt-6 space-y-3">
                {member.email && (
                  <li>
                    <a
                      href={`mailto:${member.email}`}
                      className="group inline-flex items-center gap-3 text-sm text-on-muted hover:text-champagne transition-colors break-all"
                    >
                      <Icon name="mail" className="text-base text-champagne shrink-0" />
                      <span>{member.email}</span>
                    </a>
                  </li>
                )}
                {member.phone && (
                  <li>
                    <a
                      href={`tel:${member.phone.replace(/\s+/g, "")}`}
                      className="group inline-flex items-center gap-3 text-sm text-on-muted hover:text-champagne transition-colors"
                    >
                      <Icon name="phone" className="text-base text-champagne shrink-0" />
                      <span>{member.phone}</span>
                    </a>
                  </li>
                )}
                {(() => {
                  const liHref = safeExternalUrl(member.linkedInUrl);
                  return liHref && (
                    <li>
                      <a
                        href={liHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 text-sm text-on-muted hover:text-champagne transition-colors break-all"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-4 h-4 text-champagne shrink-0">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        <span>LinkedIn</span>
                      </a>
                    </li>
                  );
                })()}
              </ul>
            )}
          </div>

          {/* Bio */}
          <div className="lg:col-span-7 lg:pt-4">
            <span className="eyebrow text-champagne block mb-4">{member.role}</span>
            <h1 className="font-display text-4xl md:text-5xl text-charcoal leading-tight">
              {member.name}
            </h1>
            <div className="gold-rule mt-6 mb-8" />
            {paragraphs.length > 0 ? (
              <div className="text-on-muted text-lg font-light leading-loose">
                {paragraphs.map((p, i) => (
                  <p key={i} className="mb-5 last:mb-0">{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-on-muted/60 font-light italic">
                {ui["leadership.detail.no_bio"] ?? "No biography available yet."}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
