namespace Oztemur.API.Domain.Entities;

/// <summary>
/// One outstanding password-reset request. The raw token never lives in the
/// DB — only its SHA-256 hash, so a leaked database dump can't be used to
/// reset accounts. The raw token only exists in the link inside the email
/// we send the user.
/// </summary>
public class PasswordResetToken : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    /// <summary>Lower-case hex SHA-256 of the raw token.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>Stamped the moment a token is consumed. A second use is rejected.</summary>
    public DateTimeOffset? UsedAt { get; set; }
}
