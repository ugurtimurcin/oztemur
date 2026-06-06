using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Features.Notifications.Services;

namespace Oztemur.API.Features.Notifications;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/notifications")
            .WithTags("Admin Notifications")
            .RequireAuthorization();

        group.MapGet("/", async (
            INotificationService svc,
            ClaimsPrincipal principal,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool unreadOnly = false) =>
        {
            if (!TryGetUserId(principal, out var userId)) return Results.Unauthorized();
            var result = await svc.GetPagedAsync(userId, page, pageSize, unreadOnly);
            return Results.Ok(result);
        });

        group.MapGet("/unread-count", async (INotificationService svc, ClaimsPrincipal principal) =>
        {
            if (!TryGetUserId(principal, out var userId)) return Results.Unauthorized();
            var result = await svc.GetUnreadCountAsync(userId);
            return Results.Ok(result);
        });

        group.MapPut("/{id:guid}/read", async (INotificationService svc, ClaimsPrincipal principal, Guid id) =>
        {
            if (!TryGetUserId(principal, out var userId)) return Results.Unauthorized();
            var result = await svc.MarkReadAsync(userId, id);
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        });

        group.MapPut("/read-all", async (INotificationService svc, ClaimsPrincipal principal) =>
        {
            if (!TryGetUserId(principal, out var userId)) return Results.Unauthorized();
            var result = await svc.MarkAllReadAsync(userId);
            return Results.Ok(result);
        });
    }

    private static bool TryGetUserId(ClaimsPrincipal principal, out Guid userId)
    {
        var raw = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out userId);
    }
}
