const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

// Returns a same-origin path the browser can load directly. Next.js rewrites
// /uploads/* to the API host (see next.config.ts) so we don't need to bake
// the API URL into the <img> src — that triggers Next 16's loopback-IP
// SSRF guard in dev and forces remotePattern whitelisting in prod.
// Use absoluteMediaUrl() instead when the URL must be globally addressable
// (OG tags, outbound emails, etc.).
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "/images/company_logo_placeholder.png";
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

interface ApiResult<T> {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T | null;
  errors: string[] | null;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── CMS Types ───────────────────────────────────────────
// Public API returns resolved strings (already localized by the backend)
export interface CompanyDto {
  id: string;
  name: string;
  sector: string;
  description: string;
  detailedDescription: string;
  address: string;
  logoUrl: string;
  websiteUrl: string;
  contactEmail: string;
  phoneNumber: string;
  displayOrder: number;
  isActive: boolean;
}

export interface NewsArticleDto {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  imageUrl: string;
  publishedAt: string;
}

export interface BlogPostDto {
  id: string;
  title: string;
  slug: string;
  author: string;
  summary: string;
  content: string;
  imageUrl: string;
  publishedAt: string;
}

// ─── Careers Types ───────────────────────────────────────
export interface JobRequisitionDto {
  id: string;
  referenceCode: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements?: string[];
  coreObjectives?: string[];
  // Legacy fields (backward compat)
  requirementsJson?: string;
  coreObjectivesJson?: string;
}

// ─── Generic Fetch Wrapper ───────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    return await res.json();
  } catch {
    return {
      success: false,
      statusCode: 500,
      message: "Network error: Unable to reach the API server.",
      data: null,
      errors: ["NETWORK_ERROR"],
    };
  }
}

// ─── CMS API ─────────────────────────────────────────────
export async function getCompanies(pageNumber = 1, pageSize = 50, lang = "tr") {
  return apiFetch<PagedResult<CompanyDto>>(
    `/api/cms/companies?pageNumber=${pageNumber}&pageSize=${pageSize}&lang=${lang}`
  );
}

export async function getNews(pageNumber = 1, pageSize = 10, lang = "tr") {
  return apiFetch<PagedResult<NewsArticleDto>>(
    `/api/cms/news?pageNumber=${pageNumber}&pageSize=${pageSize}&lang=${lang}`
  );
}

export async function getNewsBySlug(slug: string, lang = "tr") {
  return apiFetch<NewsArticleDto>(`/api/cms/news/${slug}?lang=${lang}`);
}

export async function getBlogPosts(pageNumber = 1, pageSize = 10, lang = "tr") {
  return apiFetch<PagedResult<BlogPostDto>>(
    `/api/cms/blog?pageNumber=${pageNumber}&pageSize=${pageSize}&lang=${lang}`
  );
}

export async function getBlogPostBySlug(slug: string, lang = "tr") {
  return apiFetch<BlogPostDto>(`/api/cms/blog/${slug}?lang=${lang}`);
}

// ─── Careers API ─────────────────────────────────────────
export async function getJobs(pageNumber = 1, pageSize = 20, lang = "tr") {
  return apiFetch<PagedResult<JobRequisitionDto>>(
    `/api/careers/jobs?pageNumber=${pageNumber}&pageSize=${pageSize}&lang=${lang}`
  );
}

export async function getJobById(id: string, lang = "tr") {
  return apiFetch<JobRequisitionDto>(`/api/careers/jobs/${id}?lang=${lang}`);
}

export async function submitApplication(data: {
  jobRequisitionId: string;
  candidateName: string;
  email: string;
  linkedInUrl: string;
  executiveSummary: string;
  base64CvData: string;
  turnstileToken?: string;
}) {
  return apiFetch<object>("/api/careers/apply", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Comms API ───────────────────────────────────────────
export async function submitContact(data: {
  name: string;
  email: string;
  directorate: string;
  subject: string;
  message: string;
  turnstileToken?: string;
}) {
  return apiFetch<object>("/api/comms/contact", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Projects API ────────────────────────────────────────

export interface ProjectTimelinePhaseDto {
    date: Record<string, string>;
    phase: Record<string, string>;
    details: Record<string, string>;
}

export interface ProjectDto {
    id: string;
    title: Record<string, string>;
    slug: string;
    category: Record<string, string>;
    status: string;
    year: string;
    description: Record<string, string>;
    longDescription: Record<string, string>;
    imageUrl: string;
    galleryUrls: string[];
    location: Record<string, string>;
    budget: Record<string, string>;
    timeline: ProjectTimelinePhaseDto[];
}

export async function getProjects(pageNumber = 1, pageSize = 20, lang = "tr", category?: string) {
  const qs = new URLSearchParams({
    page: String(pageNumber),
    pageSize: String(pageSize),
    language: lang,
  });
  if (category) qs.set("category", category);
  return apiFetch<PagedResult<ProjectDto>>(`/api/projects?${qs.toString()}`);
}

// Homepage showcase — admin-curated set, hard-capped at 4 server-side.
// Falls back to top-N by DisplayOrder when nothing is marked featured.
export async function getFeaturedProjects(limit = 4) {
  return apiFetch<ProjectDto[]>(`/api/projects/featured?limit=${limit}`);
}

export async function getProjectCategories(lang = "tr") {
  return apiFetch<string[]>(`/api/projects/categories?language=${encodeURIComponent(lang)}`);
}

export async function getProjectById(id: string) {
  return apiFetch<ProjectDto>(`/api/projects/${id}`);
}

export async function getProjectBySlug(slug: string) {
  return apiFetch<ProjectDto>(`/api/projects/slug/${encodeURIComponent(slug)}`);
}

// ─── Leadership API ──────────────────────────────────────
export interface LeadershipMemberDto {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
}

export async function getLeadershipMembers(lang = "tr") {
  return apiFetch<LeadershipMemberDto[]>(`/api/cms/leadership?lang=${lang}`);
}
