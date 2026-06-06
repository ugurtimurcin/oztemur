using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Common.Validation;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Users;

public record CreateUserDto(string FirstName, string LastName, string Email, string Password, List<string> Permissions);
public record UpdateUserDto(string FirstName, string LastName, string Email, string? Password, bool IsActive, List<string> Permissions);

/// <summary>
/// Admin user management. Every account is created here (registration is
/// bootstrap-only). Permissions are validated against the catalog so the
/// stored set can never contain an unknown string.
/// </summary>
public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/users").WithTags("Admin Users").RequireAuthorization();

        // Permission catalog for the admin UI to render the checkbox grid.
        group.MapGet("/permissions", () =>
            Results.Ok(Result<object>.Ok(Permissions.Catalog)))
            .RequirePermission("users.view");

        group.MapGet("/", async (IRepository<ApplicationUser> repo) =>
        {
            var users = await repo.GetAsync(_ => true);
            var dtos = users
                .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
                .Select(ToDto)
                .ToList();
            return Results.Ok(Result<List<object>>.Ok(dtos));
        }).RequirePermission("users.view");

        group.MapGet("/{id:guid}", async (Guid id, IRepository<ApplicationUser> repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user != null
                ? Results.Ok(Result<object>.Ok(ToDto(user)))
                : Results.NotFound(Result.Failure("Not found."));
        }).RequirePermission("users.view");

        group.MapPost("/", async (CreateUserDto dto, IRepository<ApplicationUser> repo) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return Results.BadRequest(Result.Failure("Email and password are required."));

            var pwError = PasswordPolicy.Validate(dto.Password);
            if (pwError != null) return Results.BadRequest(Result.Failure(pwError));

            // Compare trimmed + case-insensitively so "Test@x.com" can't slip
            // past "test@x.com" and create a duplicate account.
            var email = dto.Email.Trim();
            var emailLower = email.ToLowerInvariant();
            var existing = await repo.GetAsync(u => u.Email.ToLower() == emailLower);
            if (existing.Count > 0)
                return Results.BadRequest(Result.Failure("An account with this email already exists."));

            var user = new ApplicationUser
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Permissions = SanitizePermissions(dto.Permissions),
            };
            await repo.AddAsync(user);
            return Results.Ok(Result<object>.Ok(ToDto(user), "User created."));
        }).RequirePermission("users.edit");

        group.MapPut("/{id:guid}", async (Guid id, UpdateUserDto dto, IRepository<ApplicationUser> repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            if (user == null) return Results.NotFound(Result.Failure("Not found."));

            if (string.IsNullOrWhiteSpace(dto.Email))
                return Results.BadRequest(Result.Failure("Email is required."));

            // Reject an email already taken by a *different* account.
            var email = dto.Email.Trim();
            var emailLower = email.ToLowerInvariant();
            var clash = await repo.GetAsync(u => u.Id != id && u.Email.ToLower() == emailLower);
            if (clash.Count > 0)
                return Results.BadRequest(Result.Failure("An account with this email already exists."));

            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.Email = email;
            user.IsActive = dto.IsActive;
            user.Permissions = SanitizePermissions(dto.Permissions);
            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                var pwError = PasswordPolicy.Validate(dto.Password);
                if (pwError != null) return Results.BadRequest(Result.Failure(pwError));
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            await repo.UpdateAsync(user);
            return Results.Ok(Result.Ok("User updated."));
        }).RequirePermission("users.edit");

        group.MapDelete("/{id:guid}", async (Guid id, IRepository<ApplicationUser> repo, ClaimsPrincipal principal) =>
        {
            var user = await repo.GetByIdAsync(id);
            if (user == null) return Results.NotFound(Result.Failure("Not found."));

            // Guard against self-deletion — locking yourself out mid-session.
            var currentId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (currentId == id.ToString())
                return Results.BadRequest(Result.Failure("You cannot delete your own account."));

            await repo.DeleteAsync(user);
            return Results.Ok(Result.Ok("User deleted."));
        }).RequirePermission("users.delete");
    }

    /// <summary>Keeps only valid catalog permissions, de-duplicated.</summary>
    private static List<string> SanitizePermissions(List<string>? permissions)
        => permissions == null
            ? new List<string>()
            : permissions.Where(Permissions.IsValid).Distinct().ToList();

    private static object ToDto(ApplicationUser u) => new
    {
        u.Id,
        u.FirstName,
        u.LastName,
        u.Email,
        u.IsActive,
        u.Permissions,
        u.LastLoginAt,
        u.CreatedAt,
    };
}
