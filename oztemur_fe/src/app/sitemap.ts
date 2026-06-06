import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/server/metadata";
import { getSupportedLocales } from "@/lib/server/locale";
import { toBcp47Tag } from "@/lib/server/languageCodes";
import {
  fetchAllNews,
  fetchAllBlog,
  fetchAllProjects,
  fetchAllJobs,
} from "@/lib/server/entities";
const STATIC_PATHS = [
  "",
  "/about",
  "/companies",
  "/projects",
  "/news",
  "/blog",
  "/careers",
  "/contact",
  "/sustainability",
  "/governance",
  "/leadership",
  "/privacy",
  "/terms",
  "/kvkk",
];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supported = await getSupportedLocales();

  // Static routes — one entry each, with hreflang alternates pointing to
  // the same URL (locale is cookie-driven so we serve the same path).
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/about" ? 0.9 : 0.7,
    alternates: {
      languages: Object.fromEntries(
        supported.map(l => [toBcp47Tag(l), `${SITE_URL}${path}`]),
      ),
    },
  }));

  // Dynamic routes — pull lists in parallel. Use TR for the canonical;
  // alternates point to the same URL (cookie switches the language).
  const [news, blog, projects, jobs] = await Promise.all([
    fetchAllNews("tr"),
    fetchAllBlog("tr"),
    fetchAllProjects(),
    fetchAllJobs("tr"),
  ]);

  const newsEntries: MetadataRoute.Sitemap = news.map(n => ({
    url: `${SITE_URL}/news/${n.slug ?? n.id}`,
    lastModified: n.publishedAt ? new Date(n.publishedAt) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogEntries: MetadataRoute.Sitemap = blog.map(b => ({
    url: `${SITE_URL}/blog/${b.slug ?? b.id}`,
    lastModified: b.publishedAt ? new Date(b.publishedAt) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const projectEntries: MetadataRoute.Sitemap = projects.map(p => ({
    url: `${SITE_URL}/projects/${p.slug || p.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const jobEntries: MetadataRoute.Sitemap = jobs.map(j => ({
    url: `${SITE_URL}/careers/${j.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticEntries, ...newsEntries, ...blogEntries, ...projectEntries, ...jobEntries];
}
