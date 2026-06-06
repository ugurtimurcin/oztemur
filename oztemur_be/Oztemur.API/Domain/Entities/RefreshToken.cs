namespace Oztemur.API.Domain.Entities;

/// <summary>
/// One outstanding refresh token. The short-lived access JWT (1 hour) is
/// renewed by exchanging this token for a new pair — refresh tokens are
/// single-use and rotated on every refresh so a leaked token is invalid
/// the moment the legitimate user refreshes once.
/// </summary>
/// <remarks>
/// Raw token never lives in the DB — only its SHA-256 hash, mirroring the
/// password-reset token strategy. A leaked DB dump can't be used to forge
/// a session.
/// </remarks>
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    /// <summary>Lower-case hex SHA-256 of the raw token.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>Stamped when the token is exchanged for a new pair. A second exchange is rejected.</summary>
    public DateTimeOffset? UsedAt { get; set; }

    /// <summary>Stamped when revoked manually (logout, password reset, etc.).</summary>
    public DateTimeOffset? RevokedAt { get; set; }
}
