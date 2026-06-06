/* ═══════════════════════════════════════════════
   Friendly metadata for each pageKey known to the
   frontend. Lets the admin show readable labels
   and icons instead of raw keys like "career_detail".

   Adding a new pageKey to the seed without an entry
   here still works — the UI falls back to a humanised
   version of the key.
   ═══════════════════════════════════════════════ */

export interface SitePageMeta {
  key: string;
  label: string;
  icon: string;          // Material Symbols name
  description: string;
}

export const SITE_PAGES: SitePageMeta[] = [
  { key: "home",           label: "Home",            icon: "home",                    description: "Landing page on the public site." },
  { key: "about",          label: "About",           icon: "info",                    description: "Corporate identity, story, values." },
  { key: "companies",      label: "Companies",       icon: "business",                description: "Group companies overview." },
  { key: "projects",       label: "Projects",        icon: "foundation",              description: "Projects index page." },
  { key: "project_detail", label: "Project Detail",  icon: "architecture",            description: "Labels on a single project page." },
  { key: "news",           label: "Newsroom",        icon: "newspaper",               description: "News index page." },
  { key: "news_detail",    label: "News Detail",     icon: "article",                 description: "Labels on a single news article." },
  { key: "blog",           label: "Insights",        icon: "edit_note",               description: "Insights / journal index page." },
  { key: "blog_detail",    label: "Insight Detail",  icon: "menu_book",               description: "Labels on a single insight post." },
  { key: "careers",        label: "Careers",         icon: "work",                    description: "Careers landing page." },
  { key: "career_detail",  label: "Career Detail",   icon: "badge",                   description: "Labels on a single position page." },
  { key: "contact",        label: "Contact",         icon: "mail",                    description: "Contact page." },
  { key: "sustainability", label: "Sustainability",  icon: "eco",                     description: "Sustainability / ESG page." },
  { key: "governance",     label: "Governance",      icon: "balance",                 description: "Corporate governance page." },
  { key: "leadership",     label: "Leadership",      icon: "groups",                  description: "Leadership hero copy. Manage members under the Leadership menu item." },
  { key: "privacy",        label: "Privacy",         icon: "shield_lock",             description: "Privacy policy — full legal text." },
  { key: "terms",          label: "Terms of Use",    icon: "gavel",                   description: "Terms of use — full legal text." },
  { key: "kvkk",           label: "KVKK",            icon: "policy",                  description: "Personal-data disclosure (KVKK)." },
  { key: "not_found",      label: "404",             icon: "error",                   description: "Not-found error page." },
  { key: "footer",         label: "Footer",          icon: "align_horizontal_left",   description: "Global footer shown on every page." },
];

const META_BY_KEY = new Map(SITE_PAGES.map(p => [p.key, p]));

export function getPageMeta(key: string): SitePageMeta {
  const found = META_BY_KEY.get(key);
  if (found) return found;
  // Graceful fallback for unknown keys (e.g. when a new page is seeded but not yet listed here)
  return {
    key,
    label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    icon: "view_quilt",
    description: "",
  };
}
