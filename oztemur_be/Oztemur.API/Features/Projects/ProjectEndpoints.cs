using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using System;
using System.Collections.Generic;
using System.Linq;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Validation;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Features.Projects.Services;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Projects
{
    public static class ProjectEndpoints
    {
        public static void MapProjectEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/projects").WithTags("Projects");

            group.MapGet("/", async (IProjectService projectService, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? language = null, [FromQuery] string? category = null) =>
            {
                var result = await projectService.GetProjectsAsync(page, pageSize, language, category);
                return Results.Ok(new { success = true, data = result });
            });

            // Homepage showcase — admin-curated featured set capped at 4.
            // Falls back to the top-N by DisplayOrder when nothing is
            // marked featured so the section never empties on a fresh install.
            group.MapGet("/featured", async (IProjectService projectService, [FromQuery] int limit = 4) =>
            {
                var result = await projectService.GetFeaturedProjectsAsync(limit < 1 ? 4 : limit);
                return Results.Ok(new { success = true, data = result });
            });

            group.MapGet("/categories", async (IProjectService projectService, [FromQuery] string? language = null) =>
            {
                var result = await projectService.GetCategoriesAsync(language ?? "tr");
                return Results.Ok(new { success = true, data = result });
            });

            group.MapGet("/{id:guid}", async (IProjectService projectService, Guid id) =>
            {
                var project = await projectService.GetProjectByIdAsync(id);
                return project != null ? Results.Ok(new { success = true, data = project }) : Results.NotFound(new { success = false, message = "Project not found" });
            });

            group.MapGet("/slug/{slug}", async (IProjectService projectService, string slug) =>
            {
                var project = await projectService.GetProjectBySlugAsync(slug);
                return project != null ? Results.Ok(new { success = true, data = project }) : Results.NotFound(new { success = false, message = "Project not found" });
            });
        }

        public static void MapProjectAdminEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/admin/projects").WithTags("Admin Projects").RequireAuthorization();

            group.MapPost("/", async (IProjectService projectService, [FromBody] CreateProjectDto dto, HttpContext context, IRepository<Language> langRepo) =>
            {
                var missing = LocalizationGuard.MissingLocales(
                    (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title);
                if (missing.Count > 0)
                    return Results.BadRequest(new { success = false, message = $"Content is required for all published languages. Missing: {string.Join(", ", missing)}." });

                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
                try
                {
                    var project = await projectService.CreateProjectAsync(dto, userId);
                    return Results.Ok(new { success = true, data = project });
                }
                catch (FeaturedCapReachedException ex)
                {
                    // 409 + the current 4 featured projects — FE renders the
                    // swap modal from this payload.
                    return Results.Json(
                        new { success = false, message = "Anasayfada en fazla 4 proje öne çıkarılabilir.", data = ex.Conflict },
                        statusCode: StatusCodes.Status409Conflict);
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new { success = false, message = ex.Message });
                }
            }).RequirePermission("projects.edit");

            group.MapPut("/{id:guid}", async (IProjectService projectService, Guid id, [FromBody] UpdateProjectDto dto, HttpContext context, IRepository<Language> langRepo) =>
            {
                if (id != dto.Id) return Results.BadRequest(new { success = false, message = "ID mismatch" });

                var missing = LocalizationGuard.MissingLocales(
                    (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title);
                if (missing.Count > 0)
                    return Results.BadRequest(new { success = false, message = $"Content is required for all published languages. Missing: {string.Join(", ", missing)}." });

                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
                try
                {
                    var project = await projectService.UpdateProjectAsync(dto, userId);
                    return Results.Ok(new { success = true, data = project });
                }
                catch (FeaturedCapReachedException ex)
                {
                    return Results.Json(
                        new { success = false, message = "Anasayfada en fazla 4 proje öne çıkarılabilir.", data = ex.Conflict },
                        statusCode: StatusCodes.Status409Conflict);
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(new { success = false, message = ex.Message });
                }
            }).RequirePermission("projects.edit");

            group.MapDelete("/{id:guid}", async (IProjectService projectService, Guid id, HttpContext context) =>
            {
                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
                var result = await projectService.DeleteProjectAsync(id, userId);
                return result ? Results.Ok(new { success = true }) : Results.NotFound(new { success = false, message = "Project not found" });
            }).RequirePermission("projects.delete");

            // Drag-and-drop reorder — admin posts the new DisplayOrder for
            // each affected project. Service does a single-transaction bulk
            // update so partial saves can't leave the list in a half-state.
            group.MapPut("/reorder", async (IProjectService projectService, [FromBody] List<ReorderProjectItemDto> items) =>
            {
                if (items == null || items.Count == 0)
                    return Results.BadRequest(new { success = false, message = "No items to reorder." });
                await projectService.ReorderProjectsAsync(items);
                return Results.Ok(new { success = true, message = "Display order updated." });
            }).RequirePermission("projects.edit");
        }
    }
}
