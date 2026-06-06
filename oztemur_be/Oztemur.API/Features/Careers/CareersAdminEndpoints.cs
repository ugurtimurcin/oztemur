using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Common.Validation;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Domain.Enums;
using Oztemur.API.Features.Careers.Services;
using Oztemur.API.Features.Email;
using Oztemur.API.Infrastructure.Database;
using Oztemur.API.Infrastructure.Repositories;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;

namespace Oztemur.API.Features.Careers;

public record CreateJobDto(Dictionary<string, string> Title, string ReferenceCode, Dictionary<string, string> Department, string Location, string Type, Dictionary<string, string> Description, Dictionary<string, List<string>> Requirements, Dictionary<string, List<string>> CoreObjectives);
public record UpdateJobDto(Dictionary<string, string> Title, string ReferenceCode, Dictionary<string, string> Department, string Location, string Type, Dictionary<string, string> Description, Dictionary<string, List<string>> Requirements, Dictionary<string, List<string>> CoreObjectives, bool IsActive);
public record UpdateApplicationStatusDto(ApplicationStatus Status, string? Notes);
public record SendApplicationReplyRequest(string Subject, string Body);
public record ApplicationReplyDto(Guid Id, string Subject, string Body, bool DeliveryOk, string? SentBy, DateTimeOffset SentAt);

public static class CareersAdminEndpoints
{
    public static void MapCareersAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/careers").WithTags("Admin Careers").RequireAuthorization();

        group.MapGet("/jobs", async (int pageNumber, int pageSize, IRepository<JobRequisition> repo) =>
        {
            var (items, total) = await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 20 : pageSize);
            var paged = new PagedResult<JobRequisition>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<JobRequisition>>.Ok(paged));
        }).RequirePermission("careers.view");

        group.MapGet("/jobs/{id}", async (Guid id, IRepository<JobRequisition> repo) =>
        {
            var item = await repo.GetByIdAsync(id);
            return item != null ? Results.Ok(Result<JobRequisition>.Ok(item)) : Results.NotFound(Result.Failure("Not found."));
        }).RequirePermission("careers.view");

        group.MapPost("/jobs", async (CreateJobDto dto, ICareersService service, IRepository<Language> langRepo) =>
        {
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title, dto.Department, dto.Description);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            var result = await service.CreateJobAsync(dto.Title, dto.Department, dto.Location, dto.Type, dto.Description, dto.Requirements, dto.CoreObjectives);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequirePermission("careers.edit");

        group.MapPut("/jobs/{id}", async (Guid id, UpdateJobDto dto, ICareersService service, IRepository<Language> langRepo) =>
        {
            var missing = LocalizationGuard.MissingLocales(
                (await langRepo.GetAsync(l => l.IsActive)).Select(l => l.Code), dto.Title, dto.Department, dto.Description);
            if (missing.Count > 0)
                return Results.BadRequest(Result.Failure(
                    $"Content is required for all published languages. Missing: {string.Join(", ", missing)}."));

            var result = await service.UpdateJobAsync(id, dto.Title, dto.Department, dto.Location, dto.Type, dto.Description, dto.Requirements, dto.CoreObjectives, dto.IsActive);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequirePermission("careers.edit");

        group.MapDelete("/jobs/{id}", async (Guid id, IRepository<JobRequisition> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Job soft-deleted."));
        }).RequirePermission("careers.delete");

        group.MapGet("/applications", async (int pageNumber, int pageSize, ICareersService service) =>
        {
            var result = await service.GetApplicationsAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 20 : pageSize);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequirePermission("applications.view");

        group.MapGet("/applications/{id}", async (Guid id, ICareersService service) =>
        {
            var result = await service.GetApplicationByIdAsync(id);
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        }).RequirePermission("applications.view");

        group.MapGet("/applications/{id}/cv", async (Guid id, IRepository<JobApplication> repo) =>
        {
            var application = await repo.GetByIdAsync(id);
            if (application == null || string.IsNullOrWhiteSpace(application.CvBlobPath))
                return Results.NotFound();

            if (!System.IO.File.Exists(application.CvBlobPath))
                return Results.NotFound();

            var bytes = await System.IO.File.ReadAllBytesAsync(application.CvBlobPath);
            return Results.File(bytes, "application/pdf");
        }).RequirePermission("applications.view");

        group.MapPut("/applications/{id}/status", async (Guid id, UpdateApplicationStatusDto dto, ICareersService service, ClaimsPrincipal user) =>
        {
            var userIdString = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
                return Results.Unauthorized();

            var result = await service.UpdateApplicationStatusAsync(id, dto.Status, userId, dto.Notes);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequirePermission("applications.edit");

        // ─── Reply: send + persist ────────────────────────
        group.MapPost("/applications/{id:guid}/reply", async (Guid id, SendApplicationReplyRequest req, OztemurDbContext db, IEmailService email) =>
        {
            if (string.IsNullOrWhiteSpace(req.Subject))
                return Results.BadRequest(Result.Failure("Konu boş bırakılamaz."));
            if (string.IsNullOrWhiteSpace(req.Body))
                return Results.BadRequest(Result.Failure("Mesaj boş bırakılamaz."));

            var application = await db.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
            if (application == null) return Results.NotFound(Result.Failure("Başvuru bulunamadı."));
            if (string.IsNullOrWhiteSpace(application.Email))
                return Results.BadRequest(Result.Failure("Başvurunun aday e-postası kayıtlı değil."));

            // Persist first so admin always sees the attempt in history, even
            // on SMTP failure — DeliveryOk flag carries the outcome.
            var reply = new JobApplicationReply
            {
                JobApplicationId = id,
                Subject = req.Subject.Trim(),
                Body = req.Body,
                DeliveryOk = false,
            };
            db.JobApplicationReplies.Add(reply);
            await db.SaveChangesAsync();

            var ok = await email.SendAsync(
                new EmailMessage(
                    To: application.Email,
                    Subject: req.Subject.Trim(),
                    HtmlBody: ToHtmlBody(req.Body)),
                EmailPurpose.ApplicationReply);

            if (ok)
            {
                reply.DeliveryOk = true;
                await db.SaveChangesAsync();
            }

            var sentBy = await ResolveSentByAsync(db, reply.CreatedBy);
            var dto = new ApplicationReplyDto(reply.Id, reply.Subject, reply.Body, reply.DeliveryOk, sentBy, reply.CreatedAt);
            return ok
                ? Results.Ok(Result<ApplicationReplyDto>.Ok(dto, "Cevap gönderildi."))
                : Results.Ok(Result<ApplicationReplyDto>.Ok(dto, "Cevap kaydedildi ama mail gönderilemedi. SMTP ayarlarını kontrol edin."));
        }).RequirePermission("applications.edit");
    }

    /// <summary>
    /// Looks up a friendly display name for a single CreatedBy stamp. The
    /// audit pipeline stores the authenticated user's GUID, so this turns
    /// it into "First Last" (or email when names are blank). Non-GUID
    /// stamps and "System-Anonymous" return null so the UI can render
    /// "Sistem" / "System" as a fallback.
    /// </summary>
    private static async Task<string?> ResolveSentByAsync(OztemurDbContext db, string? createdBy)
    {
        if (string.IsNullOrWhiteSpace(createdBy)) return null;
        if (createdBy == "System-Anonymous") return null;
        if (!Guid.TryParse(createdBy, out var id)) return createdBy;
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;
        var full = (user.FirstName + " " + user.LastName).Trim();
        return string.IsNullOrWhiteSpace(full) ? user.Email : full;
    }

    /// <summary>
    /// Same plain-text → safe-HTML helper used for contact replies. Encodes
    /// user input then splits paragraphs on blank lines, keeping line breaks
    /// as &lt;br&gt;. Avoids dumping raw HTML or unescaped angle brackets.
    /// </summary>
    private static string ToHtmlBody(string plain)
    {
        var encoded = System.Net.WebUtility.HtmlEncode(plain.Trim());
        var paragraphs = encoded.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.None);
        return string.Join("", paragraphs.Select(p =>
            $"<p style=\"margin:0 0 14px 0;line-height:1.6;color:#222\">{p.Replace("\r\n", "<br/>").Replace("\n", "<br/>")}</p>"));
    }
}
