using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

/// <summary>
/// A single reusable UI string used across multiple frontend components —
/// nav labels, button captions, footer links, common form labels, etc.
///
/// One row per logical key (e.g. "common.read_more"), with a value per
/// supported language stored in the <see cref="Values"/> dictionary.
/// </summary>
public class UiString : BaseEntity
{
    /// <summary>Stable lookup key — e.g. "common.read_more", "nav.about".</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Logical bucket for editor UX — "common", "nav", "footer", "form".</summary>
    public string Group { get; set; } = "common";

    /// <summary>Optional description for content editors.</summary>
    public string? Description { get; set; }

    /// <summary>Map of { languageCode → translated value }.</summary>
    public Dictionary<string, string> Values { get; set; } = new();
}
