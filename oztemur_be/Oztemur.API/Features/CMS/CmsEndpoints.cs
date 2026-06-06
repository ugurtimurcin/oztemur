using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Features.CMS.Services;

namespace Oztemur.API.Features.CMS;

public static class CmsEndpoints
{
    public static void MapCmsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cms").WithTags("CMS");

        group.MapGet("/companies", async (int pageNumber, int pageSize, string? lang, ICmsService service) =>
        {
            var result = await service.GetCompaniesAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 50 : pageSize, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapGet("/news", async (int pageNumber, int pageSize, string? lang, ICmsService service) =>
        {
            var result = await service.GetNewsAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 10 : pageSize, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapGet("/news/{slug}", async (string slug, string? lang, ICmsService service) =>
        {
            var result = await service.GetNewsBySlugAsync(slug, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        });

        group.MapGet("/blog", async (int pageNumber, int pageSize, string? lang, ICmsService service) =>
        {
            var result = await service.GetBlogPostsAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 10 : pageSize, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapGet("/blog/{slug}", async (string slug, string? lang, ICmsService service) =>
        {
            var result = await service.GetBlogPostBySlugAsync(slug, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        });

        group.MapGet("/leadership", async (string? lang, ICmsService service) =>
        {
            var result = await service.GetLeadershipMembersAsync(lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapGet("/leadership/{id:guid}", async (Guid id, string? lang, ICmsService service) =>
        {
            var result = await service.GetLeadershipMemberByIdAsync(id, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        });

        // Slug variant is the canonical public lookup; the {id:guid} route stays
        // only so already-bookmarked UUID links keep working.
        group.MapGet("/leadership/slug/{slug}", async (string slug, string? lang, ICmsService service) =>
        {
            var result = await service.GetLeadershipMemberBySlugAsync(slug, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        });
    }
}
