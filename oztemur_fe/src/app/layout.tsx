import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import { SiteContentProvider } from "@/lib/SiteContentContext";
import { resolveLocale } from "@/lib/server/locale";
import { getPageContent, getUiStrings, pickSection } from "@/lib/server/siteContent";
import { organizationSchema, websiteSchema } from "@/lib/server/schemas";
import { dirOf } from "@/lib/rtl";
import Footer, { FOOTER_FALLBACK } from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import CookieConsent from "@/components/CookieConsent";

const CONSENT_FALLBACK: Record<string, { title: string; body: string; accept: string; learnMore: string }> = {
  tr: {
    title: "Çerezler hakkında",
    body: "Bu site, dil tercihinizi hatırlamak gibi temel işlevler için çerez kullanır. Detaylar için KVKK aydınlatma metnimize bakabilirsiniz.",
    accept: "Anladım",
    learnMore: "Detaylı bilgi",
  },
  en: {
    title: "About cookies",
    body: "This site uses cookies for essential functions such as remembering your language preference. See our personal-data disclosure for details.",
    accept: "Got it",
    learnMore: "Learn more",
  },
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

// Title template — page-level generateMetadata returns just `title: "About"`
// and Next.js renders "About | Öztemur Group Of Companies". Pages without their own
// generateMetadata fall through to `default`.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://oztemur.com"),
  title: {
    default: "Öztemur Group Of Companies | A Family of Companies",
    template: "%s | Öztemur Group Of Companies",
  },
  description:
    "Öztemur Group Of Companies is a multi-sector group of companies operating across construction, real estate, energy, logistics and trade — building generations of trust.",
  keywords: ["Öztemur", "Holding", "Group of Companies", "Construction", "Real Estate", "Energy", "Logistics", "KKTC", "Turkey"],
  openGraph: {
    title: "Öztemur Group Of Companies | A Family of Companies",
    description: "A multi-sector group of companies building generations of trust.",
    url: "/",
    siteName: "Öztemur Group Of Companies",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Öztemur Group Of Companies | A Family of Companies",
    description: "A multi-sector group of companies building generations of trust.",
  },
  icons: { icon: "/favicon.ico" },
};

// Every page key the frontend renders. Pre-fetched in parallel on the
// server so the very first paint already carries the latest CMS values
// (no client-side fetch flash, SEO-friendly).
const KNOWN_PAGE_KEYS = [
  "home",
  "about",
  "companies",
  "projects",
  "project_detail",
  "sustainability",
  "governance",
  "leadership",
  "news",
  "news_detail",
  "blog",
  "blog_detail",
  "careers",
  "career_detail",
  "contact",
  "privacy",
  "terms",
  "kvkk",
  "consent",
  "not_found",
  "footer",
] as const;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await resolveLocale();

  const pageResults = await Promise.all([
    getUiStrings(locale),
    ...KNOWN_PAGE_KEYS.map(k => getPageContent(k, locale)),
  ]);
  const uiStrings = pageResults[0] as Record<string, string>;
  const pages: Record<string, Record<string, Record<string, string>>> = {};
  KNOWN_PAGE_KEYS.forEach((k, i) => {
    pages[k] = pageResults[i + 1] as Record<string, Record<string, string>>;
  });

  const footerContent = pickSection(
    pages.footer ?? {},
    "main",
    FOOTER_FALLBACK[locale] ?? FOOTER_FALLBACK.en,
  );
  const consentContent = pickSection(
    pages.consent ?? {},
    "main",
    CONSENT_FALLBACK[locale] ?? CONSENT_FALLBACK.en,
  );

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-cream text-charcoal font-sans antialiased flex flex-col min-h-screen">
        {/* Site-wide JSON-LD: Organization + WebSite for Google
            Knowledge Panel and rich results across every page. */}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />

        <LanguageProvider initialLocale={locale}>
          <SiteContentProvider initialPages={pages} initialUiStrings={uiStrings}>
            {children}
            <Footer content={footerContent} />
            <CookieConsent content={consentContent} />
          </SiteContentProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
