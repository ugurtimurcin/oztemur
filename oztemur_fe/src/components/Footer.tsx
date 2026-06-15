import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import { safeExternalUrl } from "@/lib/url";

export type FooterContent = Record<string, string> & {
  tagline: string;
  pillarHead_group: string;
  pillarHead_company: string;
  pillarHead_contact: string;
  link_about: string;
  link_companies: string;
  link_projects: string;
  link_sustainability: string;
  link_governance: string;
  link_leadership: string;
  link_news: string;
  link_blog: string;
  link_careers: string;
  link_contact: string;
  link_privacy: string;
  link_terms: string;
  link_kvkk: string;
  address_title: string;
  address_line1: string;
  address_line2: string;
  rights: string;
  valuesHead: string;
  value1: string;
  value2: string;
  value3: string;
  quoteEyebrow: string;
  quote: string;
  social_instagram_url: string;
  social_facebook_url: string;
  social_linkedin_url: string;
  social_email: string;
};

export const FOOTER_FALLBACK: Record<string, FooterContent> = {
  tr: {
    tagline: "Nesilden nesile güven inşa eden çok sektörlü bir şirketler grubu.",
    pillarHead_group: "Grup",
    pillarHead_company: "Kurumsal",
    pillarHead_contact: "Bize Ulaşın",
    link_about: "Hakkımızda",
    link_companies: "Şirketler",
    link_projects: "Projeler",
    link_sustainability: "Sürdürülebilirlik",
    link_governance: "Kurumsal Yönetim",
    link_leadership: "Yönetim Kadrosu",
    link_news: "Haberler",
    link_blog: "İçgörüler",
    link_careers: "Kariyer",
    link_contact: "İletişim",
    link_privacy: "Gizlilik",
    link_terms: "Kullanım Koşulları",
    link_kvkk: "KVKK Aydınlatma Metni",
    address_title: "Genel Merkez",
    address_line1: "Kombos meydanı Cengizhan Sk No: 25",
    address_line2: "Gazimağusa, KKTC",
    rights: "Tüm hakları saklıdır.",
    valuesHead: "Değerlerimiz",
    value1: "Güven",
    value2: "Kalite",
    value3: "Süreklilik",
    quoteEyebrow: "Felsefemiz",
    quote: "Sermayemizden daha kalıcı olan tek şey, kurduğumuz ilişkiler ve nesillere bıraktığımız itibardır.",
    social_instagram_url: "",
    social_facebook_url: "",
    social_linkedin_url: "",
    social_email: "info@oztemur.com",
  },
  en: {
    tagline: "A multi-sector group of companies building generations of trust.",
    pillarHead_group: "The Group",
    pillarHead_company: "Corporate",
    pillarHead_contact: "Get in Touch",
    link_about: "About",
    link_companies: "Companies",
    link_projects: "Projects",
    link_sustainability: "Sustainability",
    link_governance: "Governance",
    link_leadership: "Leadership",
    link_news: "Newsroom",
    link_blog: "Insights",
    link_careers: "Careers",
    link_contact: "Contact",
    link_privacy: "Privacy",
    link_terms: "Terms of Use",
    link_kvkk: "Personal Data (KVKK)",
    address_title: "Headquarters",
    address_line1: "Kombos Square, Cengizhan Street No: 25",
    address_line2: "Famagusta, North Cyprus",
    rights: "All rights reserved.",
    valuesHead: "Our Values",
    value1: "Trust",
    value2: "Craft",
    value3: "Continuity",
    quoteEyebrow: "Our Philosophy",
    quote: "What outlasts our capital is the relationships we build and the reputation we leave to the next generation.",
    social_instagram_url: "",
    social_facebook_url: "",
    social_linkedin_url: "",
    social_email: "info@oztemur.com",
  },
};

export default function Footer({ content }: { content: FooterContent }) {
  const t = content;
  const values = [t.value1, t.value2, t.value3].filter(Boolean);
  const instagramHref = safeExternalUrl(content.social_instagram_url);
  const facebookHref = safeExternalUrl(content.social_facebook_url);
  const linkedinHref = safeExternalUrl(content.social_linkedin_url);

  return (
    <footer className="relative bg-midnight text-ivory mt-auto overflow-hidden">
      <div className="texture-grain absolute inset-0 opacity-10 pointer-events-none" />

      {/* ── Quote band ─────────────────────────────────── */}
      <div className="relative border-b border-ivory/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-20 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-3">
            <span className="eyebrow">{t.quoteEyebrow}</span>
            <div className="gold-rule mt-5" />
          </div>
          <blockquote className="lg:col-span-9 font-display text-3xl md:text-4xl lg:text-[2.75rem] leading-tight text-ivory/95 max-w-4xl">
            “{t.quote}”
          </blockquote>
        </div>
      </div>

      {/* ── Main link grid ─────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-20 grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Brand */}
        <div className="md:col-span-4">
          <div className="flex items-center gap-3.5 mb-6">
            <Image src="/images/oztemur-logo.png" alt="Öztemur" width={200} height={60} className="h-12 md:h-14 w-auto object-contain" />
            <div className="flex flex-col items-center leading-none">
              <span className="font-display text-xl tracking-wide text-ivory">ÖZTEMUR</span>
              <span className="text-[9px] font-semibold tracking-[0.32em] mt-1 text-ivory/50">GROUP OF COMPANIES</span>
            </div>
          </div>
          <p className="text-ivory/60 font-light leading-relaxed max-w-sm">{t.tagline}</p>

          <div className="mt-10 flex gap-3">
            {instagramHref && (
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 border border-ivory/15 hover:border-champagne hover:text-champagne flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {facebookHref && (
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 border border-ivory/15 hover:border-champagne hover:text-champagne flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {linkedinHref && (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 border border-ivory/15 hover:border-champagne hover:text-champagne flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
            {content.social_email && (
              <a
                href={`mailto:${content.social_email}`}
                aria-label="Email"
                className="w-10 h-10 border border-ivory/15 hover:border-champagne hover:text-champagne flex items-center justify-center transition-colors"
              >
                <Icon name="mail" className="text-base" />
              </a>
            )}
          </div>
        </div>

        {/* The Group */}
        <div className="md:col-span-2">
          <h5 className="eyebrow-muted mb-7">{t.pillarHead_group}</h5>
          <ul className="space-y-3.5">
            <li><Link href="/about"          className="text-ivory/75 hover:text-champagne transition-colors">{t.link_about}</Link></li>
            <li><Link href="/companies"      className="text-ivory/75 hover:text-champagne transition-colors">{t.link_companies}</Link></li>
            <li><Link href="/projects"       className="text-ivory/75 hover:text-champagne transition-colors">{t.link_projects}</Link></li>
            <li><Link href="/sustainability" className="text-ivory/75 hover:text-champagne transition-colors">{t.link_sustainability}</Link></li>
            <li><Link href="/governance"     className="text-ivory/75 hover:text-champagne transition-colors">{t.link_governance}</Link></li>
            <li><Link href="/leadership"     className="text-ivory/75 hover:text-champagne transition-colors">{t.link_leadership}</Link></li>
          </ul>
        </div>

        {/* Corporate */}
        <div className="md:col-span-3">
          <h5 className="eyebrow-muted mb-7">{t.pillarHead_company}</h5>
          <ul className="space-y-3.5">
            <li><Link href="/news"    className="text-ivory/75 hover:text-champagne transition-colors">{t.link_news}</Link></li>
            <li><Link href="/blog"    className="text-ivory/75 hover:text-champagne transition-colors">{t.link_blog}</Link></li>
            <li><Link href="/careers" className="text-ivory/75 hover:text-champagne transition-colors">{t.link_careers}</Link></li>
            <li><Link href="/privacy" className="text-ivory/45 hover:text-champagne transition-colors">{t.link_privacy}</Link></li>
            <li><Link href="/terms"   className="text-ivory/45 hover:text-champagne transition-colors">{t.link_terms}</Link></li>
            <li><Link href="/kvkk"    className="text-ivory/45 hover:text-champagne transition-colors">{t.link_kvkk}</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-3">
          <h5 className="eyebrow-muted mb-7">{t.pillarHead_contact}</h5>
          <p className="text-ivory/75 leading-relaxed mb-5 font-light">
            {t.address_title}<br />
            {t.address_line1}<br />
            {t.address_line2}
          </p>
          <a
            href="mailto:info@oztemur.com"
            className="block w-fit text-champagne hover:text-champagne-bright transition-colors mb-6 text-sm tracking-wide"
          >
            info@oztemur.com
          </a>
          <Link
            href="/contact"
            className="group inline-flex w-fit items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory pb-1.5 border-b border-ivory/40 hover:border-champagne hover:text-champagne transition-colors"
          >
            {t.link_contact}
            <Icon name="arrow_forward" className="text-base group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────── */}
      <div className="relative border-t border-ivory/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <span className="text-ivory/40 text-xs">
            © {new Date().getFullYear()} Öztemur Gorup Of Companies. {t.rights}
          </span>
          <div className="flex items-center gap-7">
            <span className="text-[10px] uppercase tracking-[0.32em] text-ivory/35">{t.valuesHead}:</span>
            {values.map((v, i) => (
              <span key={i} className="text-[10px] uppercase tracking-[0.32em] text-champagne/85 font-semibold">
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
