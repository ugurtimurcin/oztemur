using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

/// <summary>
/// Editorial content for a named section on a frontend page.
///
/// Identified by the (PageKey, SectionKey) pair — e.g. ("home", "hero"),
/// ("about", "values"). Holds a flat dictionary of named text fields,
/// each translated per language.
///
/// Layout, ordering and styling are NOT part of this entity. Adding,
/// removing or renaming a field requires a frontend code change as
/// well as data update.
/// </summary>
public class PageSection : BaseEntity
{
    /// <summary>Logical page identifier — e.g. "home", "about", "contact".</summary>
    public string PageKey { get; set; } = string.Empty;

    /// <summary>Named region within the page — e.g. "hero", "values", "philosophy".</summary>
    public string SectionKey { get; set; } = string.Empty;

    /// <summary>Optional description for content editors.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Map of { fieldKey → { languageCode → value } }.
    /// Example: { "eyebrow": { "tr": "...", "en": "..." }, "line1": { ... } }.
    /// </summary>
    public Dictionary<string, Dictionary<string, string>> Fields { get; set; } = new();

    public bool IsActive { get; set; } = true;
}
