namespace Oztemur.API.Domain.Entities;

/// <summary>
/// One SMTP account the admin has configured. Multiple profiles can exist —
/// the <see cref="EmailRouting"/> table decides which profile each purpose
/// (password reset, contact reply, application reply) uses.
/// </summary>
/// <remarks>
/// <see cref="SmtpPasswordEncrypted"/> is protected with ASP.NET Core
/// DataProtection. The plain-text password is never persisted nor returned
/// from API responses — admin form treats it as write-only.
/// </remarks>
public class EmailProfile : BaseEntity
{
    /// <summary>Human-readable label shown in the admin UI (e.g. "Kariyer", "Sistem").</summary>
    public string Name { get; set; } = string.Empty;

    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPasswordEncrypted { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;

    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = false;
}
