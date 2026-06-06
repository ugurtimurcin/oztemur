using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Settings;

public record CreateLanguageDto(string Code, string Name, string NativeName, string Flag, bool IsDefault, int DisplayOrder);
public record UpdateLanguageDto(string Name, string NativeName, string Flag, bool IsDefault, bool IsActive, int DisplayOrder);

public record LanguageReadinessGap(string Location, string Key);
public record LanguageReadinessBucket(int Total, int Filled, List<LanguageReadinessGap> Missing);
public record LanguageReadinessDto(
    string Code,
    bool IsReady,
    LanguageReadinessBucket PageContent,
    LanguageReadinessBucket UiStrings,
    LanguageReadinessBucket Companies,
    LanguageReadinessBucket News,
    LanguageReadinessBucket Blog,
    LanguageReadinessBucket Projects,
    LanguageReadinessBucket Careers,
    LanguageReadinessBucket Leadership);

/// <summary>
/// Bundle of repositories the readiness scan needs. Pulled out of the route
/// handler signature so it doesn't have ten constructor arguments.
/// </summary>
public record ReadinessSources(
    IRepository<PageSection> Sections,
    IRepository<UiString> UiStrings,
    IRepository<Company> Companies,
    IRepository<NewsArticle> News,
    IRepository<BlogPost> Blog,
    IRepository<Project> Projects,
    IRepository<JobRequisition> Jobs,
    IRepository<LeadershipMember> Leadership);

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/settings").WithTags("Admin Settings").RequireAuthorization();

        // ─── Languages CRUD ──────────────────────────────
        group.MapGet("/languages", async (IRepository<Language> repo) =>
        {
            var items = await repo.GetAsync(_ => true);
            var sorted = items.OrderBy(l => l.DisplayOrder).ThenBy(l => l.Code).ToList();
            return Results.Ok(Result<List<Language>>.Ok(sorted));
        }).RequirePermission("settings.view");

        group.MapPost("/languages", async (CreateLanguageDto dto, IRepository<Language> repo) =>
        {
            // Check uniqueness
            var existing = await repo.GetAsync(l => l.Code == dto.Code.ToLower());
            if (existing.Any())
                return Results.BadRequest(Result.Failure($"Language with code '{dto.Code}' already exists."));

            var entity = new Language
            {
                Code = dto.Code.ToLower().Trim(),
                Name = dto.Name,
                NativeName = dto.NativeName,
                Flag = dto.Flag,
                IsDefault = dto.IsDefault,
                // New languages start as drafts; admin publishes once translations are filled in.
                IsActive = false,
                DisplayOrder = dto.DisplayOrder
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<Language>.Ok(entity, "Language added as draft."));
        }).RequirePermission("settings.edit");

        group.MapPut("/languages/{id}", async (
            Guid id,
            UpdateLanguageDto dto,
            IRepository<Language> repo,
            IRepository<PageSection> sections,
            IRepository<UiString> uiStrings,
            IRepository<Company> companies,
            IRepository<NewsArticle> news,
            IRepository<BlogPost> blog,
            IRepository<Project> projects,
            IRepository<JobRequisition> jobs,
            IRepository<LeadershipMember> leadership,
            Oztemur.API.Features.Notifications.Services.INotificationService notifications) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));

            // Gate the draft → published transition on translation completeness.
            // Why: a half-translated language going live would leak fallback / empty
            // strings into the public site.
            if (dto.IsActive && !entity.IsActive)
            {
                var sources = new ReadinessSources(sections, uiStrings, companies, news, blog, projects, jobs, leadership);
                var readiness = await ComputeReadinessAsync(entity.Code, sources);
                if (!readiness.IsReady)
                {
                    var missing = TotalMissing(readiness);
                    return Results.BadRequest(Result.Failure(
                        $"Cannot publish '{entity.Code}': {missing} translation(s) missing. " +
                        $"Fill every Page Content, UI String, and content entry (companies, news, blog, projects, careers) for this language first."));
                }
            }

            var wasActive = entity.IsActive;
            entity.Name = dto.Name;
            entity.NativeName = dto.NativeName;
            entity.Flag = dto.Flag;
            entity.IsDefault = dto.IsDefault;
            entity.IsActive = dto.IsActive;
            entity.DisplayOrder = dto.DisplayOrder;
            await repo.UpdateAsync(entity);

            // Notify settings.* admins when a draft language transitions to live.
            if (!wasActive && entity.IsActive)
            {
                await notifications.CreateAsync(
                    permissionArea: "settings",
                    type: "language_activated",
                    title: "Language published",
                    message: $"{entity.NativeName} ({entity.Code}) is now live on the public site.",
                    link: "/settings",
                    entityId: entity.Id);
            }

            return Results.Ok(Result.Ok("Language updated."));
        }).RequirePermission("settings.edit");

        // ─── Readiness check ─────────────────────────────
        // Used by the admin Settings page to (a) show what's missing for a
        // draft language and (b) decide whether the Publish button is enabled.
        group.MapGet("/languages/{code}/readiness", async (
            string code,
            IRepository<PageSection> sections,
            IRepository<UiString> uiStrings,
            IRepository<Company> companies,
            IRepository<NewsArticle> news,
            IRepository<BlogPost> blog,
            IRepository<Project> projects,
            IRepository<JobRequisition> jobs,
            IRepository<LeadershipMember> leadership) =>
        {
            var sources = new ReadinessSources(sections, uiStrings, companies, news, blog, projects, jobs, leadership);
            var readiness = await ComputeReadinessAsync(code.ToLower(), sources);
            return Results.Ok(Result<LanguageReadinessDto>.Ok(readiness));
        }).RequirePermission("settings.view");

        group.MapDelete("/languages/{id}", async (Guid id, IRepository<Language> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            if (entity.IsDefault) return Results.BadRequest(Result.Failure("Cannot delete the default language."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Language deleted."));
        }).RequirePermission("settings.edit");

        // ─── Public: Get active languages (no auth required) ──
        app.MapGet("/api/languages", async (IRepository<Language> repo) =>
        {
            var items = await repo.GetAsync(l => l.IsActive);
            var sorted = items.OrderBy(l => l.DisplayOrder).ThenBy(l => l.Code)
                .Select(l => new { l.Code, l.Name, l.NativeName, l.Flag, l.IsDefault })
                .ToList();
            return Results.Ok(Result<object>.Ok(sorted));
        }).WithTags("Public");
    }

    private static int TotalMissing(LanguageReadinessDto r) =>
        r.PageContent.Missing.Count + r.UiStrings.Missing.Count +
        r.Companies.Missing.Count + r.News.Missing.Count + r.Blog.Missing.Count +
        r.Projects.Missing.Count + r.Careers.Missing.Count + r.Leadership.Missing.Count;

    private static async Task<LanguageReadinessDto> ComputeReadinessAsync(string code, ReadinessSources src)
    {
        var pageContent = await ScanPageContentAsync(code, src.Sections);
        var uiStrings = await ScanUiStringsAsync(code, src.UiStrings);
        var companies = await ScanCompaniesAsync(code, src.Companies);
        var news = await ScanNewsAsync(code, src.News);
        var blog = await ScanBlogAsync(code, src.Blog);
        var projects = await ScanProjectsAsync(code, src.Projects);
        var careers = await ScanCareersAsync(code, src.Jobs);
        var leadership = await ScanLeadershipAsync(code, src.Leadership);

        var isReady =
            pageContent.Missing.Count == 0 &&
            uiStrings.Missing.Count == 0 &&
            companies.Missing.Count == 0 &&
            news.Missing.Count == 0 &&
            blog.Missing.Count == 0 &&
            projects.Missing.Count == 0 &&
            careers.Missing.Count == 0 &&
            leadership.Missing.Count == 0;

        return new LanguageReadinessDto(code, isReady, pageContent, uiStrings, companies, news, blog, projects, careers, leadership);
    }

    // ─── Helpers ─────────────────────────────────────────
    // A localized dict is "filled" iff a non-whitespace value exists for the
    // target language code. Anything else (missing key, empty string) is a gap.
    private static bool IsFilled(Dictionary<string, string> dict, string code)
        => dict.TryGetValue(code, out var v) && !string.IsNullOrWhiteSpace(v);

    // Localized list is "filled" iff the entry exists for the code, is non-empty,
    // and every item in it is non-whitespace. Doesn't enforce parity with another
    // language's count — admin may intentionally have fewer items.
    private static bool IsListFilled(Dictionary<string, List<string>> dict, string code)
        => dict.TryGetValue(code, out var list)
           && list.Count > 0
           && list.All(s => !string.IsNullOrWhiteSpace(s));

    /// <summary>Best human-readable label for a row — prefers Turkish title, falls back to id prefix.</summary>
    private static string Label(Dictionary<string, string>? title, Guid id)
    {
        if (title != null && title.TryGetValue("tr", out var tr) && !string.IsNullOrWhiteSpace(tr)) return tr;
        if (title != null && title.TryGetValue("en", out var en) && !string.IsNullOrWhiteSpace(en)) return en;
        return id.ToString()[..8];
    }

    private static void Check(string code, Dictionary<string, string> dict, string location, string key,
        ref int total, ref int filled, List<LanguageReadinessGap> gaps)
    {
        total++;
        if (IsFilled(dict, code)) filled++;
        else gaps.Add(new LanguageReadinessGap(location, key));
    }

    private static void CheckList(string code, Dictionary<string, List<string>> dict, string location, string key,
        ref int total, ref int filled, List<LanguageReadinessGap> gaps)
    {
        total++;
        if (IsListFilled(dict, code)) filled++;
        else gaps.Add(new LanguageReadinessGap(location, key));
    }

    // PageSection fields that are configuration rather than translatable copy:
    // media URLs, visibility toggles, symbol suffixes, social URLs / contact
    // emails. They are empty or identical across languages by design, so they
    // must NOT count against a language's translation readiness — otherwise a
    // language whose footer URL slot is blank can never be (re)published.
    private static bool IsTranslatableField(string fieldKey)
        => !(fieldKey.EndsWith("Media", StringComparison.Ordinal)
             || fieldKey.EndsWith("Image", StringComparison.Ordinal)
             || fieldKey.EndsWith("Active", StringComparison.Ordinal)
             || fieldKey.EndsWith("_suffix", StringComparison.Ordinal)
             || fieldKey.EndsWith("_url", StringComparison.Ordinal)
             || fieldKey.EndsWith("_email", StringComparison.Ordinal)
             || fieldKey.EndsWith("_value", StringComparison.Ordinal));

    // ─── Bucket scans ────────────────────────────────────
    private static async Task<LanguageReadinessBucket> ScanPageContentAsync(string code, IRepository<PageSection> repo)
    {
        var items = await repo.GetAsync(s => s.IsActive);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var s in items)
        {
            foreach (var (fieldKey, perLang) in s.Fields)
            {
                if (!IsTranslatableField(fieldKey)) continue;
                total++;
                if (perLang.TryGetValue(code, out var v) && !string.IsNullOrWhiteSpace(v)) filled++;
                else gaps.Add(new LanguageReadinessGap($"{s.PageKey} · {s.SectionKey}", fieldKey));
            }
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanUiStringsAsync(string code, IRepository<UiString> repo)
    {
        var items = await repo.GetAsync(_ => true);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var u in items)
        {
            total++;
            if (u.Values.TryGetValue(code, out var v) && !string.IsNullOrWhiteSpace(v)) filled++;
            else gaps.Add(new LanguageReadinessGap(u.Group, u.Key));
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanCompaniesAsync(string code, IRepository<Company> repo)
    {
        var items = await repo.GetAsync(c => c.IsActive);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var c in items)
        {
            var label = Label(c.Name, c.Id);
            Check(code, c.Name, label, "name", ref total, ref filled, gaps);
            Check(code, c.Sector, label, "sector", ref total, ref filled, gaps);
            Check(code, c.Description, label, "description", ref total, ref filled, gaps);
            Check(code, c.DetailedDescription, label, "detailedDescription", ref total, ref filled, gaps);
            Check(code, c.Address, label, "address", ref total, ref filled, gaps);
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanNewsAsync(string code, IRepository<NewsArticle> repo)
    {
        var items = await repo.GetAsync(n => n.IsPublished);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var n in items)
        {
            var label = Label(n.Title, n.Id);
            Check(code, n.Title, label, "title", ref total, ref filled, gaps);
            Check(code, n.Summary, label, "summary", ref total, ref filled, gaps);
            Check(code, n.Content, label, "content", ref total, ref filled, gaps);
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanBlogAsync(string code, IRepository<BlogPost> repo)
    {
        var items = await repo.GetAsync(b => b.IsPublished);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var b in items)
        {
            var label = Label(b.Title, b.Id);
            Check(code, b.Title, label, "title", ref total, ref filled, gaps);
            Check(code, b.Summary, label, "summary", ref total, ref filled, gaps);
            Check(code, b.Content, label, "content", ref total, ref filled, gaps);
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanProjectsAsync(string code, IRepository<Project> repo)
    {
        // Projects have no published flag — every row is visible.
        var items = await repo.GetAsync(_ => true);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var p in items)
        {
            var label = Label(p.Title, p.Id);
            Check(code, p.Title, label, "title", ref total, ref filled, gaps);
            Check(code, p.Category, label, "category", ref total, ref filled, gaps);
            Check(code, p.Description, label, "description", ref total, ref filled, gaps);
            Check(code, p.LongDescription, label, "longDescription", ref total, ref filled, gaps);
            Check(code, p.Location, label, "location", ref total, ref filled, gaps);
            Check(code, p.Budget, label, "budget", ref total, ref filled, gaps);
            for (int i = 0; i < p.Timeline.Count; i++)
            {
                var phase = p.Timeline[i];
                Check(code, phase.Date, label, $"timeline[{i}].date", ref total, ref filled, gaps);
                Check(code, phase.Phase, label, $"timeline[{i}].phase", ref total, ref filled, gaps);
                Check(code, phase.Details, label, $"timeline[{i}].details", ref total, ref filled, gaps);
            }
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanLeadershipAsync(string code, IRepository<LeadershipMember> repo)
    {
        var items = await repo.GetAsync(m => m.IsActive);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var m in items)
        {
            var label = Label(m.Name, m.Id);
            Check(code, m.Name, label, "name", ref total, ref filled, gaps);
            Check(code, m.Role, label, "role", ref total, ref filled, gaps);
            Check(code, m.Bio, label, "bio", ref total, ref filled, gaps);
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    private static async Task<LanguageReadinessBucket> ScanCareersAsync(string code, IRepository<JobRequisition> repo)
    {
        var items = await repo.GetAsync(j => j.IsActive);
        var gaps = new List<LanguageReadinessGap>();
        int total = 0, filled = 0;
        foreach (var j in items)
        {
            var label = Label(j.Title, j.Id);
            Check(code, j.Title, label, "title", ref total, ref filled, gaps);
            Check(code, j.Department, label, "department", ref total, ref filled, gaps);
            Check(code, j.Description, label, "description", ref total, ref filled, gaps);
            CheckList(code, j.Requirements, label, "requirements", ref total, ref filled, gaps);
            CheckList(code, j.CoreObjectives, label, "coreObjectives", ref total, ref filled, gaps);
        }
        return new LanguageReadinessBucket(total, filled, gaps);
    }

    /// <summary>Seeds default languages if none exist. Ensures TR is default.</summary>
    public static async Task SeedLanguagesAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OztemurDbContext>();

        if (!await db.Languages.AnyAsync())
        {
            db.Languages.AddRange(
                new Language { Code = "tr", Name = "Turkish", NativeName = "Türkçe", Flag = "🇹🇷", IsDefault = true, IsActive = true, DisplayOrder = 0 },
                new Language { Code = "en", Name = "English", NativeName = "English", Flag = "🇬🇧", IsDefault = false, IsActive = true, DisplayOrder = 1 }
            );
            await db.SaveChangesAsync();
        }
        else
        {
            // Fix-up: ensure TR is default and EN is not (for existing databases)
            var tr = await db.Languages.FirstOrDefaultAsync(l => l.Code == "tr");
            var en = await db.Languages.FirstOrDefaultAsync(l => l.Code == "en");
            bool changed = false;
            if (tr != null && !tr.IsDefault) { tr.IsDefault = true; tr.DisplayOrder = 0; changed = true; }
            if (en != null && en.IsDefault) { en.IsDefault = false; en.DisplayOrder = 1; changed = true; }
            if (changed) await db.SaveChangesAsync();
        }
    }
}
