// Schema.org JSON-LD builders. All return plain objects that callers
// pass to <JsonLd data={...} />. Kept on the server so callers don't
// pull schema-only logic into client bundles.

import { SITE_NAME, SITE_URL } from "./metadata";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/oztemur-logo.png`,
    description:
      "A multi-sector group of companies operating across construction, real estate, energy, logistics and trade.",
    foundingDate: "1985",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gazimağusa",
      addressRegion: "Cyprus",
      addressCountry: "CY",
      streetAddress: "Kombos meydanı Cengizhan Sk No: 25",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "info@oztemur.com",
        availableLanguage: ["Turkish", "English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "press",
        email: "press@oztemur.com",
        availableLanguage: ["Turkish", "English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "human resources",
        email: "careers@oztemur.com",
        availableLanguage: ["Turkish", "English"],
      },
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["tr-TR", "en-US"],
  };
}

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export interface NewsArticleSchemaInput {
  headline: string;
  description: string;
  imageUrl?: string;
  datePublished?: string;
  url: string;
}

export function newsArticleSchema(input: NewsArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline,
    description: input.description,
    image: input.imageUrl ? [input.imageUrl] : undefined,
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/images/oztemur-logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
}

export interface BlogPostingSchemaInput extends NewsArticleSchemaInput {
  author?: string;
}

export function blogPostingSchema(input: BlogPostingSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    description: input.description,
    image: input.imageUrl ? [input.imageUrl] : undefined,
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    author: input.author
      ? { "@type": "Person", name: input.author }
      : { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/images/oztemur-logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
}

export interface JobPostingSchemaInput {
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: string;
  identifier?: string;
  datePosted?: string;
  url: string;
}

export function jobPostingSchema(input: JobPostingSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: input.title,
    description: input.description,
    identifier: input.identifier
      ? { "@type": "PropertyValue", name: SITE_NAME, value: input.identifier }
      : undefined,
    datePosted: input.datePosted,
    employmentType: input.type,
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
      logo: `${SITE_URL}/images/oztemur-logo.png`,
    },
    jobLocation: input.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: input.location,
          },
        }
      : undefined,
    url: input.url,
  };
}
