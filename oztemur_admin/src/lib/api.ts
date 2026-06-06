/* ═══════════════════════════════════════════════
   Öztemur Admin · API Client
   ═══════════════════════════════════════════════ */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

// ─── Auth helpers ──────────────────────────────
export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  permissions: string[];
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("oz_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("oz_refresh");
}

function storeAuth(token: string, refreshToken: string, user: AuthUser) {
  localStorage.setItem("oz_token", token);
  localStorage.setItem("oz_refresh", refreshToken);
  localStorage.setItem("oz_user", JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("oz_user");
  if (!raw) return null;
  const u = JSON.parse(raw) as Partial<AuthUser>;
  // Tolerate older stored payloads that predate the permission model.
  return { ...u, permissions: u.permissions ?? [] } as AuthUser;
}

/** True when the stored user carries the given "{module}.{action}" permission. */
export function hasPermission(permission: string): boolean {
  const u = getStoredUser();
  return !!u && u.permissions.includes(permission);
}

export function clearAuth() {
  localStorage.removeItem("oz_token");
  localStorage.removeItem("oz_refresh");
  localStorage.removeItem("oz_user");
}

export async function login(email: string, password: string) {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      storeAuth(json.data.token, json.data.refreshToken, json.data.user);
      return { success: true };
    }
    return { success: false, message: json.message || "Login failed." };
  } catch {
    return { success: false, message: "Network error." };
  }
}

// Coalesces concurrent refresh attempts so a burst of 401s only triggers
// one refresh round-trip — the others wait on the in-flight promise and
// then retry with the freshly minted access token.
let refreshInFlight: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        storeAuth(json.data.token, json.data.refreshToken, json.data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ─── Password reset (unauthenticated) ──────────
// All three endpoints are public — they're rate-limited server-side under
// the "auth" policy. The forgot-password response is always "success" so
// admins can't tell which addresses exist in the system.
async function postPublic<T = unknown>(path: string, body: unknown): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { success: !!json.success, data: json.data, message: json.message };
  } catch {
    return { success: false, message: "Network error." };
  }
}

export const authResetApi = {
  forgot: (email: string) => postPublic("/api/auth/forgot-password", { email }),
  validate: async (token: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      return { success: !!json.success, message: json.message };
    } catch {
      return { success: false, message: "Network error." };
    }
  },
  reset: (token: string, newPassword: string) => postPublic("/api/auth/reset-password", { token, newPassword }),
};

// ─── Generic fetch with auth + transparent refresh ──
// On a 401 we try to exchange the refresh token for a fresh access token
// and replay the original request once. If the refresh fails (expired /
// revoked / network), we clear auth and bounce to /login.
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string }> {
  const doRequest = async () => {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...((options.headers as Record<string, string>) || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${BASE}${path}`, { ...options, headers });
  };

  try {
    let res = await doRequest();
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        res = await doRequest();
      } else {
        clearAuth();
        if (typeof window !== "undefined") window.location.href = "/login";
        return { success: false, message: "Unauthorized" };
      }
    }

    const json = await res.json();
    return { success: json.success, data: json.data, message: json.message };
  } catch {
    return { success: false, message: "Network error." };
  }
}

// ─── i18n Helper Type ─────────────────────────
export type LocalizedField = Record<string, string>; // e.g. { en: "Hello", tr: "Merhaba" }

// ─── Types ─────────────────────────────────────
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; }

export interface CompanyDto {
  id: string; name: LocalizedField; sector: LocalizedField; description: LocalizedField; detailedDescription: LocalizedField;
  address: LocalizedField;
  logoUrl: string; websiteUrl: string; contactEmail: string; phoneNumber: string;
  displayOrder: number; isActive: boolean;
}

export interface NewsArticleDto {
  id: string; title: LocalizedField; slug: string; summary: LocalizedField; content: LocalizedField;
  imageUrl: string; isPublished: boolean; publishedAt: string | null; createdAt: string;
}

export interface BlogPostDto {
  id: string; title: LocalizedField; slug: string; author: string; summary: LocalizedField;
  content: LocalizedField; imageUrl: string; isPublished: boolean; publishedAt: string | null; createdAt: string;
}

export interface JobRequisitionDto {
  id: string; title: LocalizedField; referenceCode: string; department: LocalizedField; location: string; type: string;
  description: LocalizedField;
  // Backend stores these as Dictionary<lang, List<string>>
  requirements?: Record<string, string[]>;
  coreObjectives?: Record<string, string[]>;
  // Legacy compat — older payloads may have stringified JSON
  requirementsJson?: string;
  coreObjectivesJson?: string;
  isActive: boolean; createdAt: string;
}

export enum ApplicationStatus {
  Pending = 0,
  Reviewed = 1,
  Shortlisted = 2,
  Interviewing = 3,
  Offered = 4,
  Hired = 5,
  Rejected = 6
}

export interface JobApplicationLogDto {
  id: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  notes?: string;
  logDate: string;
  userName: string;
}

// Same row shape as MessageReplyDto — both reply types use a parallel
// structure on the wire so the UI components can stay similar.
export interface ApplicationReplyDto {
  id: string;
  subject: string;
  body: string;
  deliveryOk: boolean;
  sentBy: string | null;
  sentAt: string;
}

export interface JobApplicationDto {
  id: string;
  candidateName: string;
  email: string;
  executiveSummary: string;
  jobRequisitionId: string;
  createdAt: string;
  status: ApplicationStatus;
  jobTitle?: string;
  jobReferenceCode?: string;
  cvBlobPath?: string;
  linkedInUrl?: string;
  logs?: JobApplicationLogDto[];
  replies?: ApplicationReplyDto[];
}

export interface ContactMessageDto {
  id: string; name: string; email: string; subject: string; message: string;
  directorate: string; isRead: boolean; createdAt: string;
}

// ─── i18n Helper: get localized string ────────
export function loc(field: LocalizedField | string | undefined | null, lang: string = "tr"): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (field[lang]) return field[lang]!;
  // Fallback to Turkish, then first available
  if (field["tr"]) return field["tr"]!;
  return Object.values(field)[0] || "";
}

// ─── CMS API ───────────────────────────────────
export const cmsApi = {
  getCompanies: (p = 1, s = 50) => apiFetch<PagedResult<CompanyDto>>(`/api/admin/cms/companies?pageNumber=${p}&pageSize=${s}`),
  getCompany: (id: string) => apiFetch<CompanyDto>(`/api/admin/cms/companies/${id}`),
  createCompany: (d: Omit<CompanyDto, "id" | "isActive">) => apiFetch<CompanyDto>("/api/admin/cms/companies", { method: "POST", body: JSON.stringify(d) }),
  updateCompany: (id: string, d: Omit<CompanyDto, "id">) => apiFetch(`/api/admin/cms/companies/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteCompany: (id: string) => apiFetch(`/api/admin/cms/companies/${id}`, { method: "DELETE" }),
  reorderCompanies: (items: { id: string; displayOrder: number }[]) => apiFetch("/api/admin/cms/companies/reorder", { method: "PUT", body: JSON.stringify(items) }),

  getNews: (p = 1, s = 50) => apiFetch<PagedResult<NewsArticleDto>>(`/api/admin/cms/news?pageNumber=${p}&pageSize=${s}`),
  getNewsArticle: (id: string) => apiFetch<NewsArticleDto>(`/api/admin/cms/news/${id}`),
  createNews: (d: Omit<NewsArticleDto, "id" | "publishedAt" | "createdAt">) => apiFetch<NewsArticleDto>("/api/admin/cms/news", { method: "POST", body: JSON.stringify(d) }),
  updateNews: (id: string, d: Omit<NewsArticleDto, "id" | "publishedAt" | "createdAt">) => apiFetch(`/api/admin/cms/news/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteNews: (id: string) => apiFetch(`/api/admin/cms/news/${id}`, { method: "DELETE" }),

  getBlogs: (p = 1, s = 50) => apiFetch<PagedResult<BlogPostDto>>(`/api/admin/cms/blogs?pageNumber=${p}&pageSize=${s}`),
  getBlog: (id: string) => apiFetch<BlogPostDto>(`/api/admin/cms/blogs/${id}`),
  createBlog: (d: Omit<BlogPostDto, "id" | "publishedAt" | "createdAt">) => apiFetch<BlogPostDto>("/api/admin/cms/blogs", { method: "POST", body: JSON.stringify(d) }),
  updateBlog: (id: string, d: Omit<BlogPostDto, "id" | "publishedAt" | "createdAt">) => apiFetch(`/api/admin/cms/blogs/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteBlog: (id: string) => apiFetch(`/api/admin/cms/blogs/${id}`, { method: "DELETE" }),

  getLeadership: () => apiFetch<LeadershipMemberDto[]>("/api/admin/cms/leadership"),
  getLeadershipMember: (id: string) => apiFetch<LeadershipMemberDto>(`/api/admin/cms/leadership/${id}`),
  createLeadershipMember: (d: Omit<LeadershipMemberDto, "id" | "isActive">) => apiFetch<LeadershipMemberDto>("/api/admin/cms/leadership", { method: "POST", body: JSON.stringify(d) }),
  updateLeadershipMember: (id: string, d: Omit<LeadershipMemberDto, "id">) => apiFetch(`/api/admin/cms/leadership/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteLeadershipMember: (id: string) => apiFetch(`/api/admin/cms/leadership/${id}`, { method: "DELETE" }),
  reorderLeadership: (items: { id: string; displayOrder: number }[]) => apiFetch("/api/admin/cms/leadership/reorder", { method: "PUT", body: JSON.stringify(items) }),
};

export interface LeadershipMemberDto {
  id: string;
  name: LocalizedField;
  role: LocalizedField;
  bio: LocalizedField;
  photoUrl: string;
  displayOrder: number;
  isActive: boolean;
  slug: string;
  email: string;
  phone: string;
  linkedInUrl: string;
}

// ─── Careers API ───────────────────────────────
export const careersApi = {
  getJobs: (p = 1, s = 50) => apiFetch<PagedResult<JobRequisitionDto>>(`/api/admin/careers/jobs?pageNumber=${p}&pageSize=${s}`),
  getJob: (id: string) => apiFetch<JobRequisitionDto>(`/api/admin/careers/jobs/${id}`),
  createJob: (d: Omit<JobRequisitionDto, "id" | "isActive" | "createdAt">) => apiFetch<JobRequisitionDto>("/api/admin/careers/jobs", { method: "POST", body: JSON.stringify(d) }),
  updateJob: (id: string, d: Omit<JobRequisitionDto, "id" | "createdAt">) => apiFetch(`/api/admin/careers/jobs/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteJob: (id: string) => apiFetch(`/api/admin/careers/jobs/${id}`, { method: "DELETE" }),
  getApplications: (p = 1, s = 50) => apiFetch<PagedResult<JobApplicationDto>>(`/api/admin/careers/applications?pageNumber=${p}&pageSize=${s}`),
  getApplication: (id: string) => apiFetch<JobApplicationDto>(`/api/admin/careers/applications/${id}`),
  updateApplicationStatus: (id: string, status: ApplicationStatus, notes?: string) => apiFetch(`/api/admin/careers/applications/${id}/status`, { method: "PUT", body: JSON.stringify({ status, notes }) }),
  sendApplicationReply: (id: string, subject: string, body: string) =>
    apiFetch<ApplicationReplyDto>(`/api/admin/careers/applications/${id}/reply`, { method: "POST", body: JSON.stringify({ subject, body }) }),
  downloadCv: async (id: string) => {
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE}/api/admin/careers/applications/${id}/cv`, { headers });
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }
};

// ─── Comms API ─────────────────────────────────
// One row in the reply history shown beneath a contact message. `sentBy`
// is the admin who clicked send; `deliveryOk=false` means the row was
// persisted but SMTP rejected the message.
export interface MessageReplyDto {
  id: string;
  subject: string;
  body: string;
  deliveryOk: boolean;
  sentBy: string | null;
  sentAt: string;
}

export interface MessageDetailDto {
  message: ContactMessageDto;
  replies: MessageReplyDto[];
}

export const commsApi = {
  getMessages: (p = 1, s = 50) => apiFetch<PagedResult<ContactMessageDto>>(`/api/admin/comms/messages?pageNumber=${p}&pageSize=${s}`),
  getMessage:  (id: string) => apiFetch<MessageDetailDto>(`/api/admin/comms/messages/${id}`),
  markAsRead:  (id: string) => apiFetch(`/api/admin/comms/messages/${id}/read`, { method: "PUT" }),
  deleteMessage: (id: string) => apiFetch(`/api/admin/comms/messages/${id}`, { method: "DELETE" }),
  sendReply:   (id: string, subject: string, body: string) =>
    apiFetch<MessageReplyDto>(`/api/admin/comms/messages/${id}/reply`, { method: "POST", body: JSON.stringify({ subject, body }) }),
};

// ─── Storage API ───────────────────────────────
export interface UploadResult { url: string; fileName: string; size: number; contentType: string; }

export async function uploadFile(file: File): Promise<{ success: boolean; data?: UploadResult; message?: string }> {
  try {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE}/api/admin/storage/upload`, { method: "POST", headers, body: formData });
    if (res.status === 401) { clearAuth(); window.location.href = "/login"; return { success: false, message: "Unauthorized" }; }
    const json = await res.json();
    return { success: json.success, data: json.data, message: json.message };
  } catch {
    return { success: false, message: "Upload failed." };
  }
}

/** Resolves a relative /uploads/... path to a full URL for image preview */
export function getMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE}${path}`;
}

// ─── Projects API ──────────────────────────────
export interface ProjectTimelinePhaseDto {
  date: LocalizedField;
  phase: LocalizedField;
  details: LocalizedField;
}

export interface ProjectDto {
  id: string;
  title: LocalizedField;
  slug: string;
  category: LocalizedField;
  status: string;
  year: string;
  description: LocalizedField;
  longDescription: LocalizedField;
  imageUrl: string;
  galleryUrls: string[];
  location: LocalizedField;
  budget: LocalizedField;
  timeline: ProjectTimelinePhaseDto[];
  displayOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Optional swap hint sent on Create/Update when the admin is promoting a
// project to featured while the four-slot cap is already full. Backend
// uses it to demote the named project in the same transaction.
export type ProjectWritePayload = Omit<ProjectDto, "id" | "createdAt" | "updatedAt"> & {
  replaceFeaturedId?: string;
};

export type ProjectUpdatePayload = Omit<ProjectDto, "createdAt" | "updatedAt"> & {
  replaceFeaturedId?: string;
};

// Returned in the .data of a 409 response when the admin tries to feature
// a fifth project — the FE renders a swap modal listing these.
export interface FeaturedConflictDto {
  currentFeatured: { id: string; title: string; displayOrder: number }[];
}

export const projectsApi = {
  getProjects: (p = 1, s = 50) => apiFetch<PagedResult<ProjectDto>>(`/api/projects?page=${p}&pageSize=${s}`),
  getProject: (id: string) => apiFetch<ProjectDto>(`/api/projects/${id}`),
  createProject: (d: ProjectWritePayload) => apiFetch<ProjectDto>("/api/admin/projects", { method: "POST", body: JSON.stringify(d) }),
  updateProject: (id: string, d: ProjectUpdatePayload) => apiFetch(`/api/admin/projects/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteProject: (id: string) => apiFetch(`/api/admin/projects/${id}`, { method: "DELETE" }),
  reorderProjects: (items: { id: string; displayOrder: number }[]) =>
    apiFetch("/api/admin/projects/reorder", { method: "PUT", body: JSON.stringify(items) }),
};

// ─── Language / Settings Types ─────────────────
export interface LanguageDto {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface LanguageReadinessGap { location: string; key: string; }
export interface LanguageReadinessBucket { total: number; filled: number; missing: LanguageReadinessGap[]; }
export interface LanguageReadinessDto {
  code: string;
  isReady: boolean;
  pageContent: LanguageReadinessBucket;
  uiStrings: LanguageReadinessBucket;
  companies: LanguageReadinessBucket;
  news: LanguageReadinessBucket;
  blog: LanguageReadinessBucket;
  projects: LanguageReadinessBucket;
  careers: LanguageReadinessBucket;
  leadership: LanguageReadinessBucket;
}

export const settingsApi = {
  getLanguages: () => apiFetch<LanguageDto[]>("/api/admin/settings/languages"),
  createLanguage: (d: Omit<LanguageDto, "id" | "isActive">) => apiFetch<LanguageDto>("/api/admin/settings/languages", { method: "POST", body: JSON.stringify(d) }),
  updateLanguage: (id: string, d: Omit<LanguageDto, "id" | "code">) => apiFetch(`/api/admin/settings/languages/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteLanguage: (id: string) => apiFetch(`/api/admin/settings/languages/${id}`, { method: "DELETE" }),
  getLanguageReadiness: (code: string) => apiFetch<LanguageReadinessDto>(`/api/admin/settings/languages/${code}/readiness`),
};

// ─── Email Profiles + Routing ───────────────────
// Multiple SMTP profiles can be defined (e.g. "Sistem", "Kariyer"); a
// separate routing config maps each purpose (password reset / contact reply /
// application reply) to a profile. `smtpPassword` is write-only — server
// returns "__UNCHANGED__" when one is on file; submitting the same value
// preserves it.
export interface EmailProfileDto {
  id: string | null;
  name: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  useSsl: boolean;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
  hasPassword: boolean;
}

export interface EmailRoutingDto {
  passwordResetProfileId: string | null;
  contactReplyProfileId: string | null;
  applicationReplyProfileId: string | null;
  adminNotificationProfileId: string | null;
}

export const emailSettingsApi = {
  listProfiles:   () => apiFetch<EmailProfileDto[]>("/api/admin/settings/email/profiles"),
  getProfile:     (id: string) => apiFetch<EmailProfileDto>(`/api/admin/settings/email/profiles/${id}`),
  createProfile:  (d: Omit<EmailProfileDto, "id" | "hasPassword">) => apiFetch<EmailProfileDto>("/api/admin/settings/email/profiles", { method: "POST", body: JSON.stringify({ ...d, id: null, hasPassword: false }) }),
  updateProfile:  (id: string, d: EmailProfileDto) => apiFetch(`/api/admin/settings/email/profiles/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteProfile:  (id: string) => apiFetch(`/api/admin/settings/email/profiles/${id}`, { method: "DELETE" }),
  testProfile:    (id: string, to?: string) => apiFetch(`/api/admin/settings/email/profiles/${id}/test`, { method: "POST", body: JSON.stringify({ to: to ?? null }) }),
  getRouting:     () => apiFetch<EmailRoutingDto>("/api/admin/settings/email/routing"),
  saveRouting:    (d: EmailRoutingDto) => apiFetch("/api/admin/settings/email/routing", { method: "PUT", body: JSON.stringify(d) }),
};

// ─── Site Content (Page Sections + UI Strings) ─────
export interface PageSectionDto {
  id: string;
  pageKey: string;
  sectionKey: string;
  description: string | null;
  fields: Record<string, LocalizedField>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface UiStringDto {
  id: string;
  key: string;
  group: string;
  description: string | null;
  values: LocalizedField;
  createdAt?: string;
  updatedAt?: string | null;
}

// ─── Audit Log ─────────────────────────────────────
export interface AuditLogDto {
  id: string;
  tableName: string;
  action: string;          // INSERT | UPDATE | DELETE | SOFT-DELETE
  timestamp: string;
  userId: string | null;
  userDisplay: string | null;  // resolved account email, or the raw userId
  oldValues: string | null;  // JSON string
  newValues: string | null;  // JSON string
}

export const auditApi = {
  list: (p = 1, s = 50, filters?: { table?: string; action?: string; user?: string }) => {
    const params = new URLSearchParams();
    params.set("pageNumber", String(p));
    params.set("pageSize", String(s));
    if (filters?.table)  params.set("table", filters.table);
    if (filters?.action) params.set("action", filters.action);
    if (filters?.user)   params.set("user", filters.user);
    return apiFetch<PagedResult<AuditLogDto>>(`/api/admin/audit?${params.toString()}`);
  },
  tables: () => apiFetch<string[]>("/api/admin/audit/tables"),
};

export const siteContentApi = {
  // Page Sections
  getSections: (p = 1, s = 200) =>
    apiFetch<PagedResult<PageSectionDto>>(`/api/admin/site-content/sections?pageNumber=${p}&pageSize=${s}`),
  getSection: (id: string) => apiFetch<PageSectionDto>(`/api/admin/site-content/sections/${id}`),
  getSectionByKey: (pageKey: string, sectionKey: string) =>
    apiFetch<PageSectionDto>(
      `/api/admin/site-content/sections/by-key?pageKey=${encodeURIComponent(pageKey)}&sectionKey=${encodeURIComponent(sectionKey)}`
    ),
  createSection: (d: Omit<PageSectionDto, "id" | "createdAt" | "updatedAt">) =>
    apiFetch<PageSectionDto>("/api/admin/site-content/sections", { method: "POST", body: JSON.stringify(d) }),
  updateSection: (id: string, d: Omit<PageSectionDto, "id" | "createdAt" | "updatedAt">) =>
    apiFetch(`/api/admin/site-content/sections/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteSection: (id: string) =>
    apiFetch(`/api/admin/site-content/sections/${id}`, { method: "DELETE" }),

  // UI Strings
  getUiStrings: (p = 1, s = 500, group?: string) => {
    const q = group ? `&group=${encodeURIComponent(group)}` : "";
    return apiFetch<PagedResult<UiStringDto>>(
      `/api/admin/site-content/ui-strings?pageNumber=${p}&pageSize=${s}${q}`
    );
  },
  getUiString: (id: string) => apiFetch<UiStringDto>(`/api/admin/site-content/ui-strings/${id}`),
  createUiString: (d: Omit<UiStringDto, "id" | "createdAt" | "updatedAt">) =>
    apiFetch<UiStringDto>("/api/admin/site-content/ui-strings", { method: "POST", body: JSON.stringify(d) }),
  updateUiString: (id: string, d: Omit<UiStringDto, "id" | "createdAt" | "updatedAt">) =>
    apiFetch(`/api/admin/site-content/ui-strings/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteUiString: (id: string) =>
    apiFetch(`/api/admin/site-content/ui-strings/${id}`, { method: "DELETE" }),
};

// ─── Notifications ─────────────────────────────
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export const notificationsApi = {
  list: (page = 1, pageSize = 20, unreadOnly = false) =>
    apiFetch<NotificationListDto>(
      `/api/admin/notifications?page=${page}&pageSize=${pageSize}&unreadOnly=${unreadOnly}`
    ),
  unreadCount: () => apiFetch<number>("/api/admin/notifications/unread-count"),
  markRead: (id: string) =>
    apiFetch(`/api/admin/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () =>
    apiFetch("/api/admin/notifications/read-all", { method: "PUT" }),
};

// ─── Users & Permissions ───────────────────────
export interface ManagedUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PermissionModuleDto {
  key: string;
  label: string;
  actions: string[];
}

// ─── Translations (CSV import / export) ────────
// Powers the /translations admin page that lets editors ship the full
// content catalog out to a translator and re-import the filled CSV.
export type TranslationExportMode = "all" | "missing" | "outdated";

export interface TranslationSummary {
  source: string;
  target: string;
  total: number;
  missing: number;
  stale: number;
  upToDate: number;
}

export interface TranslationImportRowReport {
  lineNumber: number;
  entityType: string;
  entityId: string;
  fieldPath: string;
  status: string;        // "error" | "skipped"
  message: string | null;
}

export interface TranslationValidateReport {
  totalRows: number;
  applicable: number;
  unchanged: number;
  skipped: number;
  errors: number;
  issues: TranslationImportRowReport[];
}

export interface TranslationApplyReport {
  applied: number;
  skipped: number;
  entitiesTouched: number;
  issues: TranslationImportRowReport[];
}

export const translationsApi = {
  summary: (target: string) =>
    apiFetch<TranslationSummary>(`/api/admin/translations/summary?target=${encodeURIComponent(target)}`),

  // Returns the raw xlsx blob — bypasses apiFetch because the response is a
  // binary file, not JSON. Same auth + 401-refresh dance, just with .blob()
  // at the end and a content-disposition-driven filename.
  exportXlsx: async (target: string, mode: TranslationExportMode = "all"): Promise<{ blob: Blob; filename: string } | null> => {
    const url = `${BASE}/api/admin/translations/export?target=${encodeURIComponent(target)}&mode=${mode}`;
    const doRequest = async () => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(url, { headers });
    };
    let res = await doRequest();
    if (res.status === 401) {
      try {
        const refresh = await fetch(`${BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: localStorage.getItem("oz_refresh") }),
        });
        const j = await refresh.json();
        if (j.success && j.data) {
          localStorage.setItem("oz_token", j.data.token);
          localStorage.setItem("oz_refresh", j.data.refreshToken);
          localStorage.setItem("oz_user", JSON.stringify(j.data.user));
          res = await doRequest();
        }
      } catch { /* fall through to null */ }
    }
    if (!res.ok) return null;
    const blob = await res.blob();
    const cd = res.headers.get("content-disposition") || "";
    const match = cd.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] ?? `oztemur-translations-${target}.xlsx`;
    return { blob, filename };
  },

  validate: (xlsxBase64: string) =>
    apiFetch<TranslationValidateReport>("/api/admin/translations/import/validate", {
      method: "POST",
      body: JSON.stringify({ xlsxBase64 }),
    }),
  apply: (xlsxBase64: string) =>
    apiFetch<TranslationApplyReport>("/api/admin/translations/import/apply", {
      method: "POST",
      body: JSON.stringify({ xlsxBase64 }),
    }),
};

export const usersApi = {
  list: () => apiFetch<ManagedUserDto[]>("/api/admin/users"),
  get: (id: string) => apiFetch<ManagedUserDto>(`/api/admin/users/${id}`),
  permissionCatalog: () => apiFetch<PermissionModuleDto[]>("/api/admin/users/permissions"),
  create: (d: { firstName: string; lastName: string; email: string; password: string; permissions: string[] }) =>
    apiFetch<ManagedUserDto>("/api/admin/users", { method: "POST", body: JSON.stringify(d) }),
  update: (id: string, d: { firstName: string; lastName: string; email: string; password?: string; isActive: boolean; permissions: string[] }) =>
    apiFetch(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  remove: (id: string) => apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
};

