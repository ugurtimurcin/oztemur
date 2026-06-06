using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Features.Email;
using Oztemur.API.Infrastructure.Database;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Comms;

public static class CommsAdminEndpoints
{
    /// <summary>What the admin POSTs to send a new reply.</summary>
    public record SendReplyRequest(string Subject, string Body);

    /// <summary>What the API returns for one reply row.</summary>
    public record MessageReplyDto(Guid Id, string Subject, string Body, bool DeliveryOk, string? SentBy, DateTimeOffset SentAt);

    /// <summary>Message detail bundle — message + every reply sent so far.</summary>
    public record MessageDetailDto(ContactMessage Message, List<MessageReplyDto> Replies);

    public static void MapCommsAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/comms").WithTags("Admin Comms").RequireAuthorization();

        group.MapGet("/messages", async (int pageNumber, int pageSize, IRepository<ContactMessage> repo) =>
        {
            var (items, total) = await repo.GetPagedAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 20 : pageSize);
            var paged = new PagedResult<ContactMessage>(items, total, pageNumber, pageSize);
            return Results.Ok(Result<PagedResult<ContactMessage>>.Ok(paged));
        }).RequirePermission("messages.view");

        group.MapGet("/messages/{id:guid}", async (Guid id, OztemurDbContext db) =>
        {
            var entity = await db.ContactMessages.FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found.", statusCode: 404));

            var rawReplies = await db.MessageReplies
                .Where(r => r.ContactMessageId == id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.Id, r.Subject, r.Body, r.DeliveryOk, r.CreatedBy, r.CreatedAt })
                .ToListAsync();

            var resolved = await ResolveDisplayNamesAsync(db, rawReplies.Select(r => r.CreatedBy));
            var replies = rawReplies.Select(r => new MessageReplyDto(r.Id, r.Subject, r.Body, r.DeliveryOk, ResolveSentBy(r.CreatedBy, resolved), r.CreatedAt)).ToList();

            return Results.Ok(Result<MessageDetailDto>.Ok(new MessageDetailDto(entity, replies)));
        }).RequirePermission("messages.view");

        group.MapPut("/messages/{id:guid}/read", async (Guid id, IRepository<ContactMessage> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            entity.IsRead = true;
            await repo.UpdateAsync(entity);
            return Results.Ok(Result.Ok("Message marked as read."));
        }).RequirePermission("messages.edit");

        group.MapDelete("/messages/{id:guid}", async (Guid id, IRepository<ContactMessage> repo) =>
        {
            var entity = await repo.GetByIdAsync(id);
            if (entity == null) return Results.NotFound(Result.Failure("Not found."));
            await repo.DeleteAsync(entity);
            return Results.Ok(Result.Ok("Message deleted."));
        }).RequirePermission("messages.delete");

        // ─── Reply: send + persist ────────────────────────
        group.MapPost("/messages/{id:guid}/reply", async (Guid id, SendReplyRequest req, OztemurDbContext db, IEmailService email, HttpContext ctx) =>
        {
            if (string.IsNullOrWhiteSpace(req.Subject))
                return Results.BadRequest(Result.Failure("Konu boş bırakılamaz."));
            if (string.IsNullOrWhiteSpace(req.Body))
                return Results.BadRequest(Result.Failure("Mesaj boş bırakılamaz."));

            var message = await db.ContactMessages.FirstOrDefaultAsync(m => m.Id == id);
            if (message == null) return Results.NotFound(Result.Failure("Mesaj bulunamadı."));
            if (string.IsNullOrWhiteSpace(message.Email))
                return Results.BadRequest(Result.Failure("Mesajın gönderici e-postası kayıtlı değil."));

            // Persist first, send second — admin still sees the reply in
            // history even if SMTP rejects it, with a red "failed" badge.
            // The audit log captures who clicked send.
            var reply = new MessageReply
            {
                ContactMessageId = id,
                Subject = req.Subject.Trim(),
                Body = req.Body,
                DeliveryOk = false,
            };
            db.MessageReplies.Add(reply);
            await db.SaveChangesAsync();

            var ok = await email.SendAsync(
                new EmailMessage(
                    To: message.Email,
                    Subject: req.Subject.Trim(),
                    // Render plain-text body as paragraphs — line breaks
                    // become <br>, blank lines split paragraphs.
                    HtmlBody: ToHtmlBody(req.Body)),
                EmailPurpose.ContactReply);

            if (ok)
            {
                reply.DeliveryOk = true;
                await db.SaveChangesAsync();
            }

            var resolved = await ResolveDisplayNamesAsync(db, new[] { reply.CreatedBy });
            var dto = new MessageReplyDto(reply.Id, reply.Subject, reply.Body, reply.DeliveryOk, ResolveSentBy(reply.CreatedBy, resolved), reply.CreatedAt);
            return ok
                ? Results.Ok(Result<MessageReplyDto>.Ok(dto, "Cevap gönderildi."))
                : Results.Ok(Result<MessageReplyDto>.Ok(dto, "Cevap kaydedildi ama mail gönderilemedi. SMTP ayarlarını kontrol edin."));
        }).RequirePermission("messages.edit");
    }

    /// <summary>
    /// Batches user lookups for a list of <c>CreatedBy</c> stamps. The audit
    /// pipeline writes the authenticated user's GUID into <c>CreatedBy</c>,
    /// so this resolves the friendly "First Last" or email for each. Strings
    /// that aren't GUIDs (e.g. "System-Anonymous") are left untouched.
    /// </summary>
    private static async Task<Dictionary<Guid, string>> ResolveDisplayNamesAsync(OztemurDbContext db, IEnumerable<string?> rawIds)
    {
        var userIds = rawIds
            .Where(s => !string.IsNullOrWhiteSpace(s) && Guid.TryParse(s, out _))
            .Select(s => Guid.Parse(s!))
            .Distinct()
            .ToList();
        if (userIds.Count == 0) return new Dictionary<Guid, string>();

        return await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => string.IsNullOrWhiteSpace((u.FirstName + " " + u.LastName).Trim()) ? u.Email : (u.FirstName + " " + u.LastName).Trim());
    }

    private static string? ResolveSentBy(string? createdBy, Dictionary<Guid, string> resolved)
    {
        if (string.IsNullOrWhiteSpace(createdBy)) return null;
        if (createdBy == "System-Anonymous") return null;
        if (Guid.TryParse(createdBy, out var id) && resolved.TryGetValue(id, out var name)) return name;
        return createdBy;
    }

    /// <summary>
    /// Wraps plain-text body in safe HTML — encodes user input, converts
    /// newlines to &lt;br&gt;, splits paragraphs on blank lines. Avoids
    /// dumping raw HTML to the recipient since the admin's input might
    /// contain &lt; or &amp; that would render incorrectly.
    /// </summary>
    private static string ToHtmlBody(string plain)
    {
        var encoded = System.Net.WebUtility.HtmlEncode(plain.Trim());
        var paragraphs = encoded.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.None);
        return string.Join("", paragraphs.Select(p =>
            $"<p style=\"margin:0 0 14px 0;line-height:1.6;color:#222\">{p.Replace("\r\n", "<br/>").Replace("\n", "<br/>")}</p>"));
    }
}
