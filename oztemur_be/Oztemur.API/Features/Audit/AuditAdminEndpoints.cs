using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Audit;

/// <summary>
/// Read shape for an audit entry. <see cref="UserDisplay"/> is the user's
/// email when the stored <see cref="UserId"/> resolves to a known account,
/// otherwise it falls back to the raw stored value.
/// </summary>
public record AuditLogDto(
    Guid Id,
    string TableName,
    string Action,
    DateTimeOffset Timestamp,
    string? UserId,
    string? UserDisplay,
    string? OldValues,
    string? NewValues);

/// <summary>
/// Admin-only endpoints for inspecting the AuditLog table.
/// Read-only — audit entries are immutable for compliance.
/// </summary>
public static class AuditAdminEndpoints
{
    public static void MapAuditAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/audit")
            .WithTags("Admin Audit")
            .RequirePermission("audit.view");

        group.MapGet("/", async (
            int pageNumber,
            int pageSize,
            string? table,
            string? action,
            string? user,
            OztemurDbContext db) =>
        {
            var p = pageNumber < 1 ? 1 : pageNumber;
            var s = pageSize < 1 ? 50 : Math.Min(pageSize, 200);

            IQueryable<Domain.Entities.AuditLog> query = db.AuditLogs.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(table))   query = query.Where(a => a.TableName == table);
            if (!string.IsNullOrWhiteSpace(action))  query = query.Where(a => a.Action == action);
            if (!string.IsNullOrWhiteSpace(user))
            {
                // UserId stores a JWT subject (GUID) — or, for older rows, a
                // raw email. Match the stored value directly, or any GUID
                // whose account email contains the search term.
                var term = user.Trim();
                var matchingIds = await db.Users.AsNoTracking()
                    .Where(u => u.Email.Contains(term))
                    .Select(u => u.Id.ToString())
                    .ToListAsync();
                query = query.Where(a => a.UserId != null &&
                    (a.UserId.Contains(term) || matchingIds.Contains(a.UserId)));
            }

            query = query.OrderByDescending(a => a.Timestamp);

            var total = await query.CountAsync();
            var items = await query.Skip((p - 1) * s).Take(s).ToListAsync();

            // Resolve GUID UserIds to the account email for display.
            var guidIds = items
                .Where(a => Guid.TryParse(a.UserId, out _))
                .Select(a => Guid.Parse(a.UserId!))
                .Distinct()
                .ToList();
            var emailById = guidIds.Count == 0
                ? new Dictionary<string, string>()
                : await db.Users.AsNoTracking()
                    .Where(u => guidIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id.ToString(), u => u.Email);

            string? Display(string? userId)
            {
                if (string.IsNullOrWhiteSpace(userId)) return null;
                return emailById.TryGetValue(userId, out var email) ? email : userId;
            }

            var dtos = items.Select(a => new AuditLogDto(
                a.Id, a.TableName, a.Action, a.Timestamp,
                a.UserId, Display(a.UserId), a.OldValues, a.NewValues)).ToList();

            var paged = new PagedResult<AuditLogDto>(dtos, total, p, s);
            return Results.Ok(Result<PagedResult<AuditLogDto>>.Ok(paged));
        });

        // Distinct table names for the filter dropdown.
        group.MapGet("/tables", async (OztemurDbContext db) =>
        {
            var tables = await db.AuditLogs
                .AsNoTracking()
                .Select(a => a.TableName)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();
            return Results.Ok(Result<List<string>>.Ok(tables));
        });
    }
}
