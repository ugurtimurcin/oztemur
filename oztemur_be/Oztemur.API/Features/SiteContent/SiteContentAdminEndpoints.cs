using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.SiteContent;

// ─── DTOs ──────────────────────────────────────────────────────────────
public record CreatePageSectionDto(
    string PageKey,
    string SectionKey,
    string? Description,
    Dictionary<string, Dictionary<string, string>> Fields,
    bool IsActive
);

public record UpdatePageSectionDto(
    string PageKey,
    string SectionKey,
    string? Description,
    Dictionary<string, Dictionary<string, string>> Fields,
    bool IsActive
);

public record CreateUiStringDto(
    string Key,
    string Group,
    string? Description,
    Dictionary<string, string> Values
);

public record UpdateUiStringDto(
    string Key,
    string Group,
    string? Description,
    Dictionary<string, string> Values
);

// ─── Endpoints ─────────────────────────────────────────────────────────
public static class SiteContentAdminEndpoints
{
    public static void MapSiteContentAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/site-content")
            .WithTags("Admin Site Content")
            .RequireAuthorization();

        // ═══ Page Sections ═══════════════════════════════════════════════

        group.MapGet("/sections", async (int pageNumber, int pageSize, IRepository<PageSection> repo) =>
        {
            var (items, total) = await repo.GetPagedAsync(
                pageNumber < 1 ? 1 : pageNumber,
                pageSize < 1 ? 100 : pageSize);
            var paged = new PagedResult<PageSection>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<PageSection>>.Ok(paged));
        }).RequirePermission("sitecontent.view");

        group.MapGet("/sections/{id:guid}", async (Guid id, IRepository<PageSection> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            return entity != null
                ? Results.Ok(Result<PageSection>.Ok(entity))
                : Results.NotFound(Result<PageSection>.Failure("Page section not found.", statusCode: 404));
        }).RequirePermission("sitecontent.view");

        group.MapGet("/sections/by-key", async (string pageKey, string sectionKey, IRepository<PageSection> repo) =>
        {
            var matches = await repo.GetAsync(s => s.PageKey == pageKey && s.SectionKey == sectionKey);
            var entity = matches.FirstOrDefault();
            return entity != null
                ? Results.Ok(Result<PageSection>.Ok(entity))
                : Results.NotFound(Result<PageSection>.Failure("Page section not found.", statusCode: 404));
        }).RequirePermission("sitecontent.view");

        group.MapPost("/sections", async (CreatePageSectionDto dto, IRepository<PageSection> repo) =>
        {
            if (string.IsNullOrWhiteSpace(dto.PageKey) || string.IsNullOrWhiteSpace(dto.SectionKey))
                return Results.BadRequest(Result.Failure("PageKey and SectionKey are required."));

            var existing = await repo.GetAsync(s => s.PageKey == dto.PageKey && s.SectionKey == dto.SectionKey);
            if (existing.Count > 0)
                return Results.Conflict(Result.Failure(
                    $"A section with PageKey '{dto.PageKey}' and SectionKey '{dto.SectionKey}' already exists.",
                    statusCode: 409));

            var entity = new PageSection
            {
                PageKey = dto.PageKey,
                SectionKey = dto.SectionKey,
                Description = dto.Description,
                Fields = dto.Fields ?? new Dictionary<string, Dictionary<string, string>>(),
                IsActive = dto.IsActive
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<PageSection>.Ok(entity, "Page section created."));
        }).RequirePermission("sitecontent.edit");

        group.MapPut("/sections/{id:guid}", async (Guid id, UpdatePageSectionDto dto, IRepository<PageSection> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Page section not found.", statusCode: 404));

            entity.PageKey = dto.PageKey;
            entity.SectionKey = dto.SectionKey;
            entity.Description = dto.Description;
            entity.Fields = dto.Fields ?? new Dictionary<string, Dictionary<string, string>>();
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("Page section updated."));
        }).RequirePermission("sitecontent.edit");

        group.MapDelete("/sections/{id:guid}", async (Guid id, IRepository<PageSection> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Page section not found.", statusCode: 404));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Page section deleted."));
        }).RequirePermission("sitecontent.edit");

        // ═══ UI Strings ══════════════════════════════════════════════════

        group.MapGet("/ui-strings", async (int pageNumber, int pageSize, string? group, IRepository<UiString> repo) =>
        {
            var (items, total) = string.IsNullOrWhiteSpace(group)
                ? await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 200 : pageSize)
                : await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 200 : pageSize, s => s.Group == group);
            var paged = new PagedResult<UiString>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<UiString>>.Ok(paged));
        }).RequirePermission("sitecontent.view");

        group.MapGet("/ui-strings/{id:guid}", async (Guid id, IRepository<UiString> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            return entity != null
                ? Results.Ok(Result<UiString>.Ok(entity))
                : Results.NotFound(Result<UiString>.Failure("UI string not found.", statusCode: 404));
        }).RequirePermission("sitecontent.view");

        group.MapPost("/ui-strings", async (CreateUiStringDto dto, IRepository<UiString> repo) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Key))
                return Results.BadRequest(Result.Failure("Key is required."));

            var existing = await repo.GetAsync(s => s.Key == dto.Key);
            if (existing.Count > 0)
                return Results.Conflict(Result.Failure(
                    $"A UI string with Key '{dto.Key}' already exists.", statusCode: 409));

            var entity = new UiString
            {
                Key = dto.Key,
                Group = string.IsNullOrWhiteSpace(dto.Group) ? "common" : dto.Group,
                Description = dto.Description,
                Values = dto.Values ?? new Dictionary<string, string>()
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<UiString>.Ok(entity, "UI string created."));
        }).RequirePermission("sitecontent.edit");

        group.MapPut("/ui-strings/{id:guid}", async (Guid id, UpdateUiStringDto dto, IRepository<UiString> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("UI string not found.", statusCode: 404));

            entity.Key = dto.Key;
            entity.Group = string.IsNullOrWhiteSpace(dto.Group) ? "common" : dto.Group;
            entity.Description = dto.Description;
            entity.Values = dto.Values ?? new Dictionary<string, string>();
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("UI string updated."));
        }).RequirePermission("sitecontent.edit");

        group.MapDelete("/ui-strings/{id:guid}", async (Guid id, IRepository<UiString> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("UI string not found.", statusCode: 404));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("UI string deleted."));
        }).RequirePermission("sitecontent.edit");
    }
}
