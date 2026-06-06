namespace Oztemur.API.Domain.Entities;

/// <summary>
/// An admin-facing notification — a generic feed entry emitted when something
/// happens that a console operator should see (new contact message, new job
/// application, …). Read state is tracked per row.
/// </summary>
public class Notification : BaseEntity
{
    /// <summary>The recipient admin. One event fans out into one row per eligible user.</summary>
    public System.Guid UserId { get; set; }

    /// <summary>Stable event category — e.g. "contact_message", "job_application".</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Short headline shown in the notification list.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>One-line body — typically "who · what".</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Relative admin route to open when the notification is clicked.</summary>
    public string? Link { get; set; }

    /// <summary>Id of the entity that triggered this notification, when applicable.</summary>
    public System.Guid? EntityId { get; set; }

    public bool IsRead { get; set; } = false;
}
