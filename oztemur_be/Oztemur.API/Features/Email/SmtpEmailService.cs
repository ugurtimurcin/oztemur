using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Email;

/// <summary>
/// Resolves the right <see cref="EmailProfile"/> for the requested
/// <see cref="EmailPurpose"/> via the routing table, then sends through it
/// with MailKit. Catches every failure and returns false so callers can
/// treat email as best-effort without try/catch boilerplate.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly OztemurDbContext _db;
    private readonly EmailPasswordProtector _protector;
    private readonly ILogger<SmtpEmailService> _logger;

    // Tiny per-profile cache so a burst of sends doesn't hammer the DB.
    private static readonly Dictionary<Guid, (EmailProfile profile, DateTimeOffset cachedAt)> ProfileCache = new();
    private static EmailRouting? _routingCache;
    private static DateTimeOffset _routingCachedAt = DateTimeOffset.MinValue;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(5);
    private static readonly SemaphoreSlim CacheLock = new(1, 1);

    public SmtpEmailService(OztemurDbContext db, EmailPasswordProtector protector, ILogger<SmtpEmailService> logger)
    {
        _db = db;
        _protector = protector;
        _logger = logger;
    }

    public async Task<bool> SendAsync(EmailMessage message, EmailPurpose purpose, CancellationToken ct = default)
    {
        var routing = await LoadRoutingAsync(ct);
        var profileId = ResolveProfileId(routing, purpose);
        if (profileId is null)
        {
            _logger.LogInformation("Email skipped — no profile routed for {Purpose}. To={To}", purpose, message.To);
            return false;
        }

        var profile = await LoadProfileAsync(profileId.Value, ct);
        if (profile is null)
        {
            _logger.LogWarning("Email skipped — routing points to missing profile {ProfileId}. To={To}", profileId, message.To);
            return false;
        }
        if (!profile.IsEnabled)
        {
            _logger.LogInformation("Email skipped — profile '{ProfileName}' disabled. To={To}", profile.Name, message.To);
            return false;
        }

        return await SendCoreAsync(profile, message, ct);
    }

    public async Task<bool> SendTestAsync(EmailMessage message, Guid profileId, CancellationToken ct = default)
    {
        var profile = await LoadProfileAsync(profileId, ct);
        if (profile is null)
        {
            _logger.LogWarning("Test email skipped — profile {ProfileId} not found.", profileId);
            return false;
        }
        // Test bypasses IsEnabled (whole point is to verify before going live)
        // but still needs the bare minimum to actually reach a server.
        return await SendCoreAsync(profile, message, ct);
    }

    private async Task<bool> SendCoreAsync(EmailProfile profile, EmailMessage message, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(profile.SmtpHost) || string.IsNullOrWhiteSpace(profile.FromEmail))
        {
            _logger.LogInformation("Email skipped — profile '{ProfileName}' missing host or fromEmail. To={To}", profile.Name, message.To);
            return false;
        }

        try
        {
            var mime = new MimeMessage();
            mime.From.Add(new MailboxAddress(profile.FromName, profile.FromEmail));
            mime.To.Add(MailboxAddress.Parse(message.To));
            if (!string.IsNullOrWhiteSpace(message.ReplyTo))
                mime.ReplyTo.Add(MailboxAddress.Parse(message.ReplyTo));
            mime.Subject = message.Subject;
            mime.Body = new BodyBuilder { HtmlBody = message.HtmlBody }.ToMessageBody();

            using var client = new SmtpClient();
            // 465 = implicit TLS, 587 = STARTTLS, 25 = none.
            var secureOption = profile.UseSsl && profile.SmtpPort == 465
                ? SecureSocketOptions.SslOnConnect
                : (profile.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None);

            await client.ConnectAsync(profile.SmtpHost, profile.SmtpPort, secureOption, ct);

            if (!string.IsNullOrWhiteSpace(profile.SmtpUsername))
            {
                var password = _protector.TryUnprotect(profile.SmtpPasswordEncrypted);
                if (password is null)
                {
                    _logger.LogError("Email send aborted — could not decrypt password for profile '{ProfileName}' (DataProtection keys may have rotated). Re-save profile.", profile.Name);
                    await client.DisconnectAsync(true, ct);
                    return false;
                }
                await client.AuthenticateAsync(profile.SmtpUsername, password, ct);
            }

            await client.SendAsync(mime, ct);
            await client.DisconnectAsync(true, ct);

            _logger.LogInformation("Email sent via profile '{ProfileName}'. To={To} Subject={Subject}", profile.Name, message.To, message.Subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email send failed via profile '{ProfileName}'. To={To} Subject={Subject}", profile.Name, message.To, message.Subject);
            return false;
        }
    }

    private static Guid? ResolveProfileId(EmailRouting? routing, EmailPurpose purpose)
    {
        if (routing is null) return null;
        return purpose switch
        {
            EmailPurpose.PasswordReset     => routing.PasswordResetProfileId,
            EmailPurpose.ContactReply      => routing.ContactReplyProfileId,
            EmailPurpose.ApplicationReply  => routing.ApplicationReplyProfileId,
            EmailPurpose.AdminNotification => routing.AdminNotificationProfileId,
            _ => null,
        };
    }

    private async Task<EmailRouting?> LoadRoutingAsync(CancellationToken ct)
    {
        if (_routingCache is not null && DateTimeOffset.UtcNow - _routingCachedAt < CacheTtl) return _routingCache;
        await CacheLock.WaitAsync(ct);
        try
        {
            if (_routingCache is not null && DateTimeOffset.UtcNow - _routingCachedAt < CacheTtl) return _routingCache;
            _routingCache = await _db.EmailRoutings.AsNoTracking().FirstOrDefaultAsync(ct);
            _routingCachedAt = DateTimeOffset.UtcNow;
            return _routingCache;
        }
        finally { CacheLock.Release(); }
    }

    private async Task<EmailProfile?> LoadProfileAsync(Guid id, CancellationToken ct)
    {
        if (ProfileCache.TryGetValue(id, out var entry) && DateTimeOffset.UtcNow - entry.cachedAt < CacheTtl) return entry.profile;
        await CacheLock.WaitAsync(ct);
        try
        {
            if (ProfileCache.TryGetValue(id, out entry) && DateTimeOffset.UtcNow - entry.cachedAt < CacheTtl) return entry.profile;
            var profile = await _db.EmailProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
            if (profile is not null) ProfileCache[id] = (profile, DateTimeOffset.UtcNow);
            return profile;
        }
        finally { CacheLock.Release(); }
    }

    /// <summary>Force the next call to re-read both routing and all profiles from DB.</summary>
    public static void InvalidateCache()
    {
        _routingCache = null;
        _routingCachedAt = DateTimeOffset.MinValue;
        ProfileCache.Clear();
    }
}
