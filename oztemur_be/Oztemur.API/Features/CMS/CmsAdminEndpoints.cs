using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Common.Validation;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace Oztemur.API.Features.CMS;

// ─── i18n-aware DTOs ─────────────────────────────
public record CreateCompanyDto(Dictionary<string, string> Name, Dictionary<string, string> Sector, Dictionary<string, string> Description, Dictionary<string, string> DetailedDescription, Dictionary<string, string> Address, string LogoUrl, string WebsiteUrl, string ContactEmail, string PhoneNumber, int DisplayOrder);
public record UpdateCompanyDto(Dictionary<string, string> Name, Dictionary<string, string> Sector, Dictionary<string, string> Description, Dictionary<string, string> DetailedDescription, Dictionary<string, string> Address, string LogoUrl, string WebsiteUrl, string ContactEmail, string PhoneNumber, int DisplayOrder, bool IsActive);
public record CreateNewsDto(Dictionary<string, string> Title, string Slug, Dictionary<string, string> Summary, Dictionary<string, string> Content, string ImageUrl, bool IsPublished);
public record UpdateNewsDto(Dictionary<string, string> Title, string Slug, Dictionary<string, string> Summary, Dictionary<string, string> Content, string ImageUrl, bool IsPublished);
public record CreateBlogDto(Dictionary<string, string> Title, string Slug, string Author, Dictionary<string, string> Summary, Dictionary<string, string> Content, string ImageUrl, bool IsPublished);
public record UpdateBlogDto(Dictionary<string, string> Title, string Slug, string Author, Dictionary<string, string> Summary, Dictionary<string, string> Content, string ImageUrl, bool IsPublished);
public record CreateLeadershipMemberDto(Dictionary<string, string> Name, Dictionary<string, string> Role, Dictionary<string, string> Bio, string PhotoUrl, int DisplayOrder, string? Slug, string? Email, string? Phone, string? LinkedInUrl);
public record UpdateLeadershipMemberDto(Dictionary<string, string> Name, Dictionary<string, string> Role, Dictionary<string, string> Bio, string PhotoUrl, int DisplayOrder, bool IsActive, string? Slug, string? Email, string? Phone, string? LinkedInUrl);
public record ReorderItemDto(Guid Id, int DisplayOrder);

public static class CmsAdminEndpoints
{
    public static void MapCmsAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/cms").WithTags("Admin CMS").RequireAuthorization();

        // ─── Companies CRUD ──────────────────────────────
        group.MapGet("/companies", async (int pageNumber, int pageSize, IRepository<Company> repo) =>
        {
            var (items, total) = await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 50 : pageSize);
            var paged = new PagedResult<Company>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<Company>>.Ok(paged));
        }).RequirePermission("companies.view");

        group.MapGet("/companies/{id}", async (Guid id, IRepository<Company> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            return entity != null ? Results.Ok(Result<Company>.Ok(entity)) : Results.NotFound(Result<Company>.Failure("Not found.", statusCode: 404));
        }).RequirePermission("companies.view");

        group.MapPost("/companies", async (CreateCompanyDto dto, IRepository<Company> repo, IRepository<Language> langRepo) =>
        {
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Name, dto.Sector);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            var entity = new Company
            {
                Name = dto.Name, Sector = dto.Sector, Description = dto.Description,
                DetailedDescription = dto.DetailedDescription, Address = dto.Address ?? new(),
                LogoUrl = dto.LogoUrl,
                WebsiteUrl = dto.WebsiteUrl, ContactEmail = dto.ContactEmail,
                PhoneNumber = dto.PhoneNumber, DisplayOrder = dto.DisplayOrder
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<Company>.Ok(entity, "Company created."));
        }).RequirePermission("companies.edit");

        group.MapPut("/companies/{id}", async (Guid id, UpdateCompanyDto dto, IRepository<Company> repo, IRepository<Language> langRepo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Name, dto.Sector);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));
            entity.Name = dto.Name; entity.Sector = dto.Sector; entity.Description = dto.Description;
            entity.DetailedDescription = dto.DetailedDescription;
            entity.Address = dto.Address ?? new();
            entity.LogoUrl = dto.LogoUrl;
            entity.WebsiteUrl = dto.WebsiteUrl; entity.ContactEmail = dto.ContactEmail;
            entity.PhoneNumber = dto.PhoneNumber; entity.DisplayOrder = dto.DisplayOrder;
            entity.IsActive = dto.IsActive;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("Company updated."));
        }).RequirePermission("companies.edit");

        group.MapDelete("/companies/{id}", async (Guid id, IRepository<Company> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Company deleted."));
        }).RequirePermission("companies.delete");

        group.MapPut("/companies/reorder", async (ReorderItemDto[] items, IRepository<Company> repo) =>
        {
            foreach (var item in items)
            {
                var entity = await repo.GetByIdAsync(item.Id);
                if (entity != null)
                {
                    entity.DisplayOrder = item.DisplayOrder;
                    await repo.UpdateAsync(entity);
                }
            }
            return Results.Ok(Result.Ok("Display order updated."));
        }).RequirePermission("companies.edit");

        // ─── News CRUD ───────────────────────────────────
        group.MapGet("/news", async (int pageNumber, int pageSize, IRepository<NewsArticle> repo) =>
        {
            var (items, total) = await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 20 : pageSize);
            var paged = new PagedResult<NewsArticle>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<NewsArticle>>.Ok(paged));
        }).RequirePermission("news.view");

        group.MapGet("/news/{id}", async (Guid id, IRepository<NewsArticle> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            return entity != null ? Results.Ok(Result<NewsArticle>.Ok(entity)) : Results.NotFound(Result<NewsArticle>.Failure("Not found.", statusCode: 404));
        }).RequirePermission("news.view");

        group.MapPost("/news", async (CreateNewsDto dto, IRepository<NewsArticle> repo, IRepository<Language> langRepo) =>
        {
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title, dto.Content);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            var entity = new NewsArticle
            {
                Title = dto.Title, Slug = dto.Slug, Summary = dto.Summary,
                Content = dto.Content, ImageUrl = dto.ImageUrl,
                IsPublished = dto.IsPublished,
                PublishedAt = dto.IsPublished ? DateTimeOffset.UtcNow : null
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<NewsArticle>.Ok(entity, "News article created."));
        }).RequirePermission("news.edit");

        group.MapPut("/news/{id}", async (Guid id, UpdateNewsDto dto, IRepository<NewsArticle> repo, IRepository<Language> langRepo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title, dto.Content);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));
            entity.Title = dto.Title; entity.Slug = dto.Slug; entity.Summary = dto.Summary;
            entity.Content = dto.Content; entity.ImageUrl = dto.ImageUrl;
            if (!entity.IsPublished && dto.IsPublished) entity.PublishedAt = DateTimeOffset.UtcNow;
            entity.IsPublished = dto.IsPublished;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("News article updated."));
        }).RequirePermission("news.edit");

        group.MapDelete("/news/{id}", async (Guid id, IRepository<NewsArticle> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("News article deleted."));
        }).RequirePermission("news.delete");

        // ─── Blog CRUD ───────────────────────────────────
        group.MapGet("/blogs", async (int pageNumber, int pageSize, IRepository<BlogPost> repo) =>
        {
            var (items, total) = await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 20 : pageSize);
            var paged = new PagedResult<BlogPost>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<BlogPost>>.Ok(paged));
        }).RequirePermission("blog.view");

        group.MapGet("/blogs/{id}", async (Guid id, IRepository<BlogPost> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            return entity != null ? Results.Ok(Result<BlogPost>.Ok(entity)) : Results.NotFound(Result<BlogPost>.Failure("Not found.", statusCode: 404));
        }).RequirePermission("blog.view");

        group.MapPost("/blogs", async (CreateBlogDto dto, IRepository<BlogPost> repo, IRepository<Language> langRepo) =>
        {
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title, dto.Content);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            var entity = new BlogPost
            {
                Title = dto.Title, Slug = dto.Slug, Author = dto.Author,
                Summary = dto.Summary, Content = dto.Content, ImageUrl = dto.ImageUrl,
                IsPublished = dto.IsPublished,
                PublishedAt = dto.IsPublished ? DateTimeOffset.UtcNow : null
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<BlogPost>.Ok(entity, "Blog post created."));
        }).RequirePermission("blog.edit");

        group.MapPut("/blogs/{id}", async (Guid id, UpdateBlogDto dto, IRepository<BlogPost> repo, IRepository<Language> langRepo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title, dto.Content);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));
            entity.Title = dto.Title; entity.Slug = dto.Slug; entity.Author = dto.Author;
            entity.Summary = dto.Summary; entity.Content = dto.Content; entity.ImageUrl = dto.ImageUrl;
            if (!entity.IsPublished && dto.IsPublished) entity.PublishedAt = DateTimeOffset.UtcNow;
            entity.IsPublished = dto.IsPublished;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("Blog post updated."));
        }).RequirePermission("blog.edit");

        group.MapDelete("/blogs/{id}", async (Guid id, IRepository<BlogPost> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Blog post deleted."));
        }).RequirePermission("blog.delete");

        // ─── Leadership Members CRUD ─────────────────────
        group.MapGet("/leadership", async (IRepository<LeadershipMember> repo) =>
        {
            var items = await repo.GetAsync(_ => true);
            var sorted = items.OrderBy(m => m.DisplayOrder).ToList();
            return Results.Ok(Result<List<LeadershipMember>>.Ok(sorted));
        }).RequirePermission("leadership.view");

        group.MapGet("/leadership/{id}", async (Guid id, IRepository<LeadershipMember> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            return entity != null
                ? Results.Ok(Result<LeadershipMember>.Ok(entity))
                : Results.NotFound(Result<LeadershipMember>.Failure("Not found.", statusCode: 404));
        }).RequirePermission("leadership.view");

        group.MapPost("/leadership", async (CreateLeadershipMemberDto dto, IRepository<LeadershipMember> repo, IRepository<Language> langRepo) =>
        {
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Name, dto.Role);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            // Admin may supply a custom slug; otherwise auto-generate from the Turkish name
            // (falling back to English) so URLs are never empty/uuid-leaking.
            var slugSource = !string.IsNullOrWhiteSpace(dto.Slug)
                ? dto.Slug!
                : (dto.Name.TryGetValue("tr", out var trName) && !string.IsNullOrWhiteSpace(trName) ? trName
                    : dto.Name.TryGetValue("en", out var enName) ? enName : string.Empty);
            var slug = Oztemur.API.Common.Slug.Generate(slugSource);
            if (string.IsNullOrEmpty(slug))
                return Results.BadRequest(Result.Failure("Slug oluşturulamadı. Lütfen geçerli bir ad veya slug girin."));

            var existing = await repo.GetAsync(m => m.Slug == slug);
            if (existing.Count > 0)
                return Results.BadRequest(Result.Failure($"Bu slug zaten kullanılıyor: '{slug}'."));

            var entity = new LeadershipMember
            {
                Name = dto.Name, Role = dto.Role, Bio = dto.Bio,
                PhotoUrl = dto.PhotoUrl, DisplayOrder = dto.DisplayOrder,
                Slug = slug,
                Email = dto.Email?.Trim() ?? string.Empty,
                Phone = dto.Phone?.Trim() ?? string.Empty,
                LinkedInUrl = dto.LinkedInUrl?.Trim() ?? string.Empty,
            };
            await repo.AddAsync(entity);
            return Results.Ok(Result<LeadershipMember>.Ok(entity, "Leadership member created."));
        }).RequirePermission("leadership.edit");

        group.MapPut("/leadership/{id}", async (Guid id, UpdateLeadershipMemberDto dto, IRepository<LeadershipMember> repo, IRepository<Language> langRepo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Name, dto.Role);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            var slugSource = !string.IsNullOrWhiteSpace(dto.Slug)
                ? dto.Slug!
                : (dto.Name.TryGetValue("tr", out var trName) && !string.IsNullOrWhiteSpace(trName) ? trName
                    : dto.Name.TryGetValue("en", out var enName) ? enName : string.Empty);
            var slug = Oztemur.API.Common.Slug.Generate(slugSource);
            if (string.IsNullOrEmpty(slug))
                return Results.BadRequest(Result.Failure("Slug oluşturulamadı. Lütfen geçerli bir ad veya slug girin."));

            var conflicting = await repo.GetAsync(m => m.Slug == slug && m.Id != id);
            if (conflicting.Count > 0)
                return Results.BadRequest(Result.Failure($"Bu slug zaten kullanılıyor: '{slug}'."));

            entity.Name = dto.Name; entity.Role = dto.Role; entity.Bio = dto.Bio;
            entity.PhotoUrl = dto.PhotoUrl; entity.DisplayOrder = dto.DisplayOrder;
            entity.IsActive = dto.IsActive;
            entity.Slug = slug;
            entity.Email = dto.Email?.Trim() ?? string.Empty;
            entity.Phone = dto.Phone?.Trim() ?? string.Empty;
            entity.LinkedInUrl = dto.LinkedInUrl?.Trim() ?? string.Empty;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("Leadership member updated."));
        }).RequirePermission("leadership.edit");

        group.MapDelete("/leadership/{id}", async (Guid id, IRepository<LeadershipMember> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Leadership member deleted."));
        }).RequirePermission("leadership.delete");

        group.MapPut("/leadership/reorder", async (ReorderItemDto[] items, IRepository<LeadershipMember> repo) =>
        {
            foreach (var item in items)
            {
                var entity = await repo.GetByIdAsync(item.Id);
                if (entity != null)
                {
                    entity.DisplayOrder = item.DisplayOrder;
                    await repo.UpdateAsync(entity);
                }
            }
            return Results.Ok(Result.Ok("Display order updated."));
        }).RequirePermission("leadership.edit");
    }
}
