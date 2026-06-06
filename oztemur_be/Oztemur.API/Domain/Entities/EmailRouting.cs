namespace Oztemur.API.Domain.Entities;

/// <summary>
/// Single-row table mapping email purposes (password reset / contact reply /
/// application reply) to the <see cref="EmailProfile"/> that should send
/// them. A null FK means "no profile assigned — don't send for this purpose"
/// and callers fall back to in-app notifications only.
/// </summary>
public class EmailRouting : BaseEntity
{
    public Guid? PasswordResetProfileId { get; set; }
    public Guid? ContactReplyProfileId { get; set; }
    public Guid? ApplicationReplyProfileId { get; set; }
    public Guid? AdminNotificationProfileId { get; set; }
}
