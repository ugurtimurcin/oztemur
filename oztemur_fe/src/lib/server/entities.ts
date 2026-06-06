// Server-only: lightweight fetchers for entity detail pages, used by
// generateMetadata. Mirrors the public endpoints exposed by the .NET API.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";
const REVALIDATE_SECONDS = 60;

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T | null;
}

async function fetchJson<T>(path: string, tag: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [tag] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<T>;
    if (json?.success && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

export interface NewsMeta {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl: string;
  publishedAt: string;
}

export async function fetchNewsArticle(slug: string, locale: string): Promise<NewsMeta | null> {
  return fetchJson<NewsMeta>(
    `/api/cms/news/${encodeURIComponent(slug)}?lang=${encodeURIComponent(locale)}`,
    `news:${slug}`,
  );
}

export interface BlogMeta {
  id: string;
  title: string;
  slug: string;
  author: string;
  summary: string;
  imageUrl: string;
  publishedAt: string;
}

export async function fetchBlogPost(slug: string, locale: string): Promise<BlogMeta | null> {
  return fetchJson<BlogMeta>(
    `/api/cms/blog/${encodeURIComponent(slug)}?lang=${encodeURIComponent(locale)}`,
    `blog:${slug}`,
  );
}

export interface ProjectMeta {
  id: string;
  title: Record<string, string>;
  slug: string;
  category: Record<string, string>;
  description: Record<string, string>;
  imageUrl: string;
  year: string;
}

export async function fetchProject(id: string): Promise<ProjectMeta | null> {
  return fetchJson<ProjectMeta>(`/api/projects/${encodeURIComponent(id)}`, `project:${id}`);
}

export async function fetchProjectBySlug(slug: string): Promise<ProjectMeta | null> {
  return fetchJson<ProjectMeta>(`/api/projects/slug/${encodeURIComponent(slug)}`, `project:${slug}`);
}

export interface JobMeta {
  id: string;
  title: string;
  referenceCode: string;
  department: string;
  location: string;
  type: string;
  description: string;
}

export async function fetchJob(id: string, locale: string): Promise<JobMeta | null> {
  return fetchJson<JobMeta>(
    `/api/careers/jobs/${encodeURIComponent(id)}?lang=${encodeURIComponent(locale)}`,
    `job:${id}`,
  );
}

/** Page lists used by sitemap. */

export interface NewsListItem { id: string; slug: string; publishedAt: string; }
export interface BlogListItem { id: string; slug: string; publishedAt: string; }
export interface ProjectListItem { id: string; slug?: string; }
export interface JobListItem { id: string; }

interface PagedResult<T> { items: T[]; }

export async function fetchAllNews(locale: string): Promise<NewsListItem[]> {
  const data = await fetchJson<PagedResult<NewsListItem>>(
    `/api/cms/news?pageNumber=1&pageSize=500&lang=${locale}`,
    "news-list",
  );
  return data?.items ?? [];
}

export async function fetchAllBlog(locale: string): Promise<BlogListItem[]> {
  const data = await fetchJson<PagedResult<BlogListItem>>(
    `/api/cms/blog?pageNumber=1&pageSize=500&lang=${locale}`,
    "blog-list",
  );
  return data?.items ?? [];
}

export async function fetchAllProjects(): Promise<ProjectListItem[]> {
  const data = await fetchJson<PagedResult<ProjectListItem>>(
    `/api/projects?page=1&pageSize=500`,
    "project-list",
  );
  return data?.items ?? [];
}

export async function fetchAllJobs(locale: string): Promise<JobListItem[]> {
  const data = await fetchJson<PagedResult<JobListItem>>(
    `/api/careers/jobs?pageNumber=1&pageSize=500&lang=${locale}`,
    "job-list",
  );
  return data?.items ?? [];
}
