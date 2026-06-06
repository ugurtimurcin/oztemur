namespace Oztemur.API.Features.Email;

/// <summary>
/// Sends transactional email. The concrete profile (SMTP server, from
/// address) is resolved via the <c>EmailRouting</c> table based on the
/// caller-supplied <see cref="EmailPurpose"/> — callers never name a
/// profile directly.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Attempts to send <paramref name="message"/> using the profile mapped
    /// to <paramref name="purpose"/>. Returns true on success, false when
    /// the purpose has no profile, the profile is disabled, or delivery
    /// fails. Never throws.
    /// </summary>
    Task<bool> SendAsync(EmailMessage message, EmailPurpose purpose, CancellationToken ct = default);

    /// <summary>
    /// Sends through a specific profile, bypassing the IsEnabled flag.
    /// Used by the admin's "Test e-postası gönder" button so config can be
    /// verified before going live.
    /// </summary>
    Task<bool> SendTestAsync(EmailMessage message, Guid profileId, CancellationToken ct = default);
}
