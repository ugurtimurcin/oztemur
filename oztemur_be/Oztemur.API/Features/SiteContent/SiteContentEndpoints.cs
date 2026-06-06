using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Common.Models;
using Oztemur.API.Features.SiteContent.Services;

namespace Oztemur.API.Features.SiteContent;

/// <summary>
/// Public, anonymous read endpoints consumed by the Next.js frontend
/// to populate static page text and UI labels at runtime.
/// </summary>
public static class SiteContentEndpoints
{
    public static void MapSiteContentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cms").WithTags("Site Content");

        // GET /api/cms/page/home?lang=tr
        //   → { hero: { eyebrow, line1, ... }, philosophy: { ... }, ... }
        group.MapGet("/page/{pageKey}", async (string pageKey, string? lang, ISiteContentService service) =>
        {
            var result = await service.GetPageAsync(pageKey, string.IsNullOrWhiteSpace(lang) ? "tr" : lang);
            return Results.Ok(result);
        });

        // GET /api/cms/ui-strings?lang=tr&group=common
        //   → { "common.read_more": "Read more", ... }
        group.MapGet("/ui-strings", async (string? lang, string? group, ISiteContentService service) =>
        {
            var result = await service.GetUiStringsAsync(string.IsNullOrWhiteSpace(lang) ? "tr" : lang, group);
            return Results.Ok(result);
        });
    }
}
