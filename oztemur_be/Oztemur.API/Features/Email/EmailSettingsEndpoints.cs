using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Email;

/// <summary>
/// Admin endpoints for the multi-profile email setup:
/// <list type="bullet">
///   <item>CRUD on <c>EmailProfile</c> rows — one per SMTP account.</item>
///   <item>GET/PUT a single <c>EmailRouting</c> row that maps each
///         <see cref="EmailPurpose"/> to a profile.</item>
///   <item>POST <c>/profiles/{id}/test</c> to verify a profile before it goes live.</item>
/// </list>
/// The plaintext password is never returned — GET sends a fixed placeholder
/// when one is on file, and PUT preserves the existing value when the admin
/// submits the same placeholder.
/// </summary>
public static class EmailSettingsEndpoints
{
    private const string PasswordMask = "__UNCHANGED__";

    public record EmailProfileDto(
        Guid? Id,
        string Name,
        string SmtpHost,
        int SmtpPort,
        string SmtpUsername,
        string SmtpPassword,
        bool UseSsl,
        string FromEmail,
        string FromName,
        bool IsEnabled,
        bool HasPassword);

    public record EmailRoutingDto(
        Guid? PasswordResetProfileId,
        Guid? ContactReplyProfileId,
        Guid? ApplicationReplyProfileId,
        Guid? AdminNotificationProfileId);

    public record TestEmailRequest(string? To);

    public static void MapEmailSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/settings/email")
            .WithTags("Admin Email Settings")
            .RequireAuthorization();

        // ─── Profiles list ────────────────────────────────
        group.MapGet("/profiles", async (OztemurDbContext db) =>
        {
            var items = await db.EmailProfiles.AsNoTracking().OrderBy(p => p.Name).ToListAsync();
            var dtos = items.Select(ToDto).ToList();
            return Results.Ok(Result<List<EmailProfileDto>>.Ok(dtos));
        }).RequirePermission("settings.view");

        group.MapGet("/profiles/{id:guid}", async (Guid id, OztemurDbContext db) =>
        {
            var p = await db.EmailProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            return p is null
                ? Results.NotFound(Result.Failure("Profil bulunamadı."))
                : Results.Ok(Result<EmailProfileDto>.Ok(ToDto(p)));
        }).RequirePermission("settings.view");

        group.MapPost("/profiles", async (EmailProfileDto dto, OztemurDbContext db, EmailPasswordProtector protector) =>
        {
            var err = ValidateProfile(dto);
            if (err is not null) return Results.BadRequest(Result.Failure(err));

            var entity = new EmailProfile
            {
                Name = dto.Name.Trim(),
                SmtpHost = dto.SmtpHost.Trim(),
                SmtpPort = dto.SmtpPort <= 0 ? 587 : dto.SmtpPort,
                SmtpUsername = dto.SmtpUsername?.Trim() ?? "",
                SmtpPasswordEncrypted = protector.Protect(dto.SmtpPassword ?? ""),
                UseSsl = dto.UseSsl,
                FromEmail = dto.FromEmail.Trim(),
                FromName = dto.FromName?.Trim() ?? "",
                IsEnabled = dto.IsEnabled,
            };
            db.EmailProfiles.Add(entity);
            await db.SaveChangesAsync();

            SmtpEmailService.InvalidateCache();
            return Results.Ok(Result<EmailProfileDto>.Ok(ToDto(entity), "Profil oluşturuldu."));
        }).RequirePermission("settings.edit");

        group.MapPut("/profiles/{id:guid}", async (Guid id, EmailProfileDto dto, OztemurDbContext db, EmailPasswordProtector protector) =>
        {
            var entity = await db.EmailProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (entity is null) return Results.NotFound(Result.Failure("Profil bulunamadı."));

            var err = ValidateProfile(dto);
            if (err is not null) return Results.BadRequest(Result.Failure(err));

            entity.Name = dto.Name.Trim();
            entity.SmtpHost = dto.SmtpHost.Trim();
            entity.SmtpPort = dto.SmtpPort <= 0 ? 587 : dto.SmtpPort;
            entity.SmtpUsername = dto.SmtpUsername?.Trim() ?? "";
            entity.UseSsl = dto.UseSsl;
            entity.FromEmail = dto.FromEmail.Trim();
            entity.FromName = dto.FromName?.Trim() ?? "";
            entity.IsEnabled = dto.IsEnabled;

            // Write-only password: keep existing ciphertext when admin submits
            // the mask, encrypt fresh value otherwise.
            if (dto.SmtpPassword != PasswordMask)
                entity.SmtpPasswordEncrypted = protector.Protect(dto.SmtpPassword ?? "");

            await db.SaveChangesAsync();
            SmtpEmailService.InvalidateCache();
            return Results.Ok(Result.Ok("Profil güncellendi."));
        }).RequirePermission("settings.edit");

        group.MapDelete("/profiles/{id:guid}", async (Guid id, OztemurDbContext db) =>
        {
            var entity = await db.EmailProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (entity is null) return Results.NotFound(Result.Failure("Profil bulunamadı."));

            // Clear any routing rows still pointing at this profile so we
            // don't leave dangling FKs after soft delete.
            var routing = await db.EmailRoutings.FirstOrDefaultAsync();
            if (routing is not null)
            {
                if (routing.PasswordResetProfileId == id) routing.PasswordResetProfileId = null;
                if (routing.ContactReplyProfileId == id) routing.ContactReplyProfileId = null;
                if (routing.ApplicationReplyProfileId == id) routing.ApplicationReplyProfileId = null;
            }

            entity.IsDeleted = true;
            entity.DeletedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();

            SmtpEmailService.InvalidateCache();
            return Results.Ok(Result.Ok("Profil silindi."));
        }).RequirePermission("settings.edit");

        // ─── Per-profile test send ────────────────────────
        group.MapPost("/profiles/{id:guid}/test", async (Guid id, TestEmailRequest req, IEmailService email, OztemurDbContext db, HttpContext ctx) =>
        {
            var to = string.IsNullOrWhiteSpace(req.To)
                ? ctx.User.FindFirst(ClaimTypes.Email)?.Value
                : req.To;
            if (string.IsNullOrWhiteSpace(to))
                return Results.BadRequest(Result.Failure("Test mail gönderebilmek için bir alıcı adresi gerekli."));

            var p = await db.EmailProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return Results.NotFound(Result.Failure("Profil bulunamadı."));
            if (string.IsNullOrWhiteSpace(p.SmtpHost) || string.IsNullOrWhiteSpace(p.FromEmail))
                return Results.BadRequest(Result.Failure(
                    "Test göndermek için en az SMTP sunucusu ve gönderici e-posta alanları doldurulup kaydedilmelidir."));

            var ok = await email.SendTestAsync(new EmailMessage(
                To: to,
                Subject: $"Öztemur Admin · Test e-postası ({p.Name})",
                HtmlBody: $"""
                    <p>Bu, Öztemur admin panelinden <strong>{System.Net.WebUtility.HtmlEncode(p.Name)}</strong> profili ile gönderilen bir test mesajıdır.</p>
                    <p>SMTP ayarlarınız doğru çalışıyor.</p>
                    <hr/>
                    <p style="color:#888;font-size:12px">Gönderim zamanı: {DateTimeOffset.UtcNow:u}</p>
                """),
                profileId: id);

            return ok
                ? Results.Ok(Result.Ok($"Test mail '{to}' adresine gönderildi."))
                : Results.BadRequest(Result.Failure(
                    "Mail gönderilemedi. Sunucu hata logunda detayları kontrol edin (yanlış kullanıcı/şifre, port, TLS ayarı olabilir)."));
        }).RequirePermission("settings.edit");

        // ─── Routing get/put ──────────────────────────────
        group.MapGet("/routing", async (OztemurDbContext db) =>
        {
            var r = await db.EmailRoutings.AsNoTracking().FirstOrDefaultAsync();
            var dto = r is null
                ? new EmailRoutingDto(null, null, null, null)
                : new EmailRoutingDto(r.PasswordResetProfileId, r.ContactReplyProfileId, r.ApplicationReplyProfileId, r.AdminNotificationProfileId);
            return Results.Ok(Result<EmailRoutingDto>.Ok(dto));
        }).RequirePermission("settings.view");

        group.MapPut("/routing", async (EmailRoutingDto dto, OztemurDbContext db) =>
        {
            // Reject FKs that point at nonexistent / soft-deleted profiles
            // before saving — otherwise the next email send would fail at
            // delivery time with a confusing "missing profile" error.
            var referencedIds = new[] { dto.PasswordResetProfileId, dto.ContactReplyProfileId, dto.ApplicationReplyProfileId, dto.AdminNotificationProfileId }
                .Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            if (referencedIds.Count > 0)
            {
                var existing = await db.EmailProfiles.AsNoTracking().Where(p => referencedIds.Contains(p.Id)).Select(p => p.Id).ToListAsync();
                var missing = referencedIds.Except(existing).ToList();
                if (missing.Count > 0)
                    return Results.BadRequest(Result.Failure("Yönlendirme geçersiz profile başvuruyor."));
            }

            var entity = await db.EmailRoutings.FirstOrDefaultAsync();
            var isNew = entity is null;
            entity ??= new EmailRouting();
            entity.PasswordResetProfileId = dto.PasswordResetProfileId;
            entity.ContactReplyProfileId = dto.ContactReplyProfileId;
            entity.ApplicationReplyProfileId = dto.ApplicationReplyProfileId;
            entity.AdminNotificationProfileId = dto.AdminNotificationProfileId;

            if (isNew) db.EmailRoutings.Add(entity);
            await db.SaveChangesAsync();
            SmtpEmailService.InvalidateCache();
            return Results.Ok(Result.Ok("Yönlendirme kaydedildi."));
        }).RequirePermission("settings.edit");
    }

    /// <summary>Domain-level rules. Returns null when valid, otherwise the error message.</summary>
    private static string? ValidateProfile(EmailProfileDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return "Profil adı zorunludur.";
        if (string.IsNullOrWhiteSpace(dto.SmtpHost)) return "SMTP sunucusu zorunludur.";
        if (dto.SmtpPort < 1 || dto.SmtpPort > 65535) return "Geçerli bir SMTP portu girin (1–65535).";
        if (string.IsNullOrWhiteSpace(dto.FromEmail)) return "Gönderici e-posta zorunludur.";
        if (!dto.FromEmail.Contains('@')) return "Gönderici e-posta geçerli görünmüyor.";
        return null;
    }

    private static EmailProfileDto ToDto(EmailProfile p) => new(
        Id: p.Id,
        Name: p.Name,
        SmtpHost: p.SmtpHost,
        SmtpPort: p.SmtpPort,
        SmtpUsername: p.SmtpUsername,
        SmtpPassword: string.IsNullOrEmpty(p.SmtpPasswordEncrypted) ? "" : PasswordMask,
        UseSsl: p.UseSsl,
        FromEmail: p.FromEmail,
        FromName: p.FromName,
        IsEnabled: p.IsEnabled,
        HasPassword: !string.IsNullOrEmpty(p.SmtpPasswordEncrypted));
}
