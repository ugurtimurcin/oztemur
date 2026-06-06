using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Features.Email;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Notifications.Services;

/// <summary>Item shape sent to the admin notification UI.</summary>
public record NotificationItem(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string? Link,
    Guid? EntityId,
    bool IsRead,
    DateTimeOffset CreatedAt);

/// <summary>Paged notification feed + the current unread total for the badge.</summary>
public record NotificationListResult(
    List<NotificationItem> Items,
    int TotalCount,
    int UnreadCount,
    int Page,
    int PageSize);

public class NotificationService : INotificationService
{
    private readonly OztemurDbContext _db;
    private readonly IEmailService _email;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(OztemurDbContext db, IEmailService email, ILogger<NotificationService> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task CreateAsync(
        string permissionArea,
        string type,
        string title,
        string message,
        string? link = null,
        Guid? entityId = null)
    {
        // Translate "messages" → every permission that starts with "messages.".
        // The permissions catalog uses dotted names (messages.view, messages.edit, …).
        var prefix = permissionArea + ".";

        // Load active users + their permissions and filter in memory. Npgsql's
        // LINQ translation for List<string>.Any(predicate) on jsonb/text[] is
        // fragile; the admin pool is small enough that this is fine.
        var users = await _db.Users.AsNoTracking()
            .Where(u => u.IsActive)
            .Select(u => new { u.Id, u.Email, u.Permissions })
            .ToListAsync();

        var targets = users
            .Where(u => u.Permissions.Any(p => p.StartsWith(prefix, StringComparison.Ordinal)))
            .ToList();

        if (targets.Count == 0) return;

        foreach (var u in targets)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = u.Id,
                Type = type,
                Title = title,
                Message = message,
                Link = link,
                EntityId = entityId,
            });
        }
        await _db.SaveChangesAsync();

        // Best-effort outbound mail to the same recipients. Failures are
        // logged but don't roll back the persisted notifications — the panel
        // bell is still the source of truth.
        await FanoutEmailAsync(targets.Select(u => u.Email), title, message, link);
    }

    public async Task CreateForUserAsync(
        Guid userId,
        string type,
        string title,
        string message,
        string? link = null,
        Guid? entityId = null)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            Link = link,
            EntityId = entityId,
        });
        await _db.SaveChangesAsync();

        // Lookup the recipient's email so we can mirror the in-app notification
        // as an outbound mail. Skipped silently if the row was deleted.
        var email = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Email)
            .FirstOrDefaultAsync();
        if (!string.IsNullOrWhiteSpace(email))
            await FanoutEmailAsync(new[] { email }, title, message, link);
    }

    /// <summary>
    /// Sends one mail per recipient using the AdminNotification route. Each
    /// send is independent — one bad address doesn't block the others.
    /// </summary>
    private async Task FanoutEmailAsync(IEnumerable<string> recipients, string title, string message, string? link)
    {
        var htmlBody = BuildNotificationHtml(title, message, link);
        foreach (var to in recipients)
        {
            if (string.IsNullOrWhiteSpace(to)) continue;
            try
            {
                await _email.SendAsync(new EmailMessage(to, title, htmlBody), EmailPurpose.AdminNotification);
            }
            catch (Exception ex)
            {
                // SendAsync swallows by contract, but defend the loop anyway —
                // we never want a mail failure to bubble up to the caller.
                _logger.LogWarning(ex, "Notification email fanout to {To} threw unexpectedly", to);
            }
        }
    }

    /// <summary>
    /// Minimal styled HTML wrapper. Title becomes the heading, message is
    /// rendered as a paragraph, link (if present) becomes a CTA button.
    /// User-supplied strings are HTML-encoded so a stray &lt; doesn't break
    /// the layout or open an injection vector.
    /// </summary>
    private static string BuildNotificationHtml(string title, string message, string? link)
    {
        var encTitle = System.Net.WebUtility.HtmlEncode(title);
        var encMessage = System.Net.WebUtility.HtmlEncode(message).Replace("\n", "<br/>");
        var cta = string.IsNullOrWhiteSpace(link)
            ? ""
            : $"<p style=\"margin-top:20px\"><a href=\"{System.Net.WebUtility.HtmlEncode(link)}\" style=\"display:inline-block;padding:10px 20px;background:#000666;color:#fff;text-decoration:none;border-radius:6px;font-weight:600\">Panele git</a></p>";
        return $@"
            <div style=""font-family:system-ui,sans-serif;max-width:560px;color:#222"">
              <h2 style=""margin:0 0 12px 0;font-size:18px;color:#000666"">{encTitle}</h2>
              <p style=""margin:0;line-height:1.6;color:#444"">{encMessage}</p>
              {cta}
              <hr style=""margin:24px 0;border:none;border-top:1px solid #eee""/>
              <p style=""font-size:11px;color:#999;margin:0"">Öztemur admin paneli · otomatik bildirim</p>
            </div>";
    }

    public async Task<Result<NotificationListResult>> GetPagedAsync(Guid userId, int page, int pageSize, bool unreadOnly)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var query = _db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) query = query.Where(n => !n.IsRead);

        var total = await query.CountAsync();
        var unread = await _db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationItem(
                n.Id, n.Type, n.Title, n.Message, n.Link, n.EntityId, n.IsRead, n.CreatedAt))
            .ToListAsync();

        return Result<NotificationListResult>.Ok(
            new NotificationListResult(items, total, unread, page, pageSize));
    }

    public async Task<Result<int>> GetUnreadCountAsync(Guid userId)
    {
        var count = await _db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead);
        return Result<int>.Ok(count);
    }

    public async Task<Result> MarkReadAsync(Guid userId, Guid id)
    {
        // Scope by userId — a user can only mark their own notifications.
        var entity = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (entity == null) return Result.Failure("Notification not found.");
        if (!entity.IsRead)
        {
            entity.IsRead = true;
            entity.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
        }
        return Result.Ok("Notification marked as read.");
    }

    public async Task<Result> MarkAllReadAsync(Guid userId)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.UpdatedAt = DateTimeOffset.UtcNow;
        }
        if (unread.Count > 0) await _db.SaveChangesAsync();
        return Result.Ok($"{unread.Count} notification(s) marked as read.");
    }
}
