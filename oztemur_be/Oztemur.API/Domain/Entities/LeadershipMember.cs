using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

/// <summary>
/// One profile on the public Leadership page. Localized name/role/bio
/// plus a photo URL and ordering. The page hides itself entirely if
/// no active members exist — the entity drives the section's visibility.
/// </summary>
public class LeadershipMember : BaseEntity
{
    public Dictionary<string, string> Name { get; set; } = new();
    public Dictionary<string, string> Role { get; set; } = new();
    public Dictionary<string, string> Bio { get; set; } = new();
    public string PhotoUrl { get; set; } = string.Empty;
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    // URL-friendly identifier used in public detail pages (/leadership/{slug}).
    // Uniqueness is enforced at the application layer (not via a DB unique index)
    // so admins get a clear Turkish error message instead of an opaque 500.
    public string Slug { get; set; } = string.Empty;

    // Optional contact channels rendered under the portrait on the detail
    // page — each is only shown when non-empty so an unpopulated profile
    // simply omits the block.
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string LinkedInUrl { get; set; } = string.Empty;
}
