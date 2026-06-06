using System;

namespace Oztemur.API.Domain.Entities;

/// <summary>
/// Records the SHA-256 hash of the source (Turkish) text at the moment a
/// translation into <see cref="TargetLanguage"/> was imported. The CSV
/// export endpoint compares the current source hash to the stored one to
/// decide whether a translation is fresh or has gone <c>stale</c> because
/// the source was edited after translation.
///
/// Identified by the (EntityType, EntityId, FieldPath, TargetLanguage)
/// tuple — one row per translatable field per non-default language.
/// </summary>
public class TranslationSourceHash : BaseEntity
{
    /// <summary>Domain entity short name, e.g. "Project", "PageSection".</summary>
    public string EntityType { get; set; } = string.Empty;

    public Guid EntityId { get; set; }

    /// <summary>
    /// Dot/bracket path identifying the field within the entity. Examples:
    /// <c>Title</c>, <c>Timeline[0].Phase</c>, <c>Fields.eyebrow</c>,
    /// <c>Requirements[2]</c>, <c>Value</c> (UiString).
    /// </summary>
    public string FieldPath { get; set; } = string.Empty;

    /// <summary>Language code the translation was imported into.</summary>
    public string TargetLanguage { get; set; } = string.Empty;

    /// <summary>SHA-256 hex digest of the source text at translation time.</summary>
    public string SourceHash { get; set; } = string.Empty;
}
