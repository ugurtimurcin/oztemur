using System;
using System.Collections.Generic;

namespace Oztemur.API.Features.Translations;

/// <summary>
/// One translatable field on one entity, with both the current source-language
/// text and (if present) the existing target-language translation.
/// </summary>
public record TranslatableField(
    string EntityType,
    Guid EntityId,
    string EntityLabel,
    string FieldPath,
    string SourceText,
    string? TargetText);

public enum TranslationStatus
{
    /// <summary>Target text is empty.</summary>
    Missing,
    /// <summary>Target text exists but source has changed since it was imported.</summary>
    Stale,
    /// <summary>Target text exists and matches the stored source hash.</summary>
    UpToDate
}

public record TranslationRow(
    string EntityType,
    Guid EntityId,
    string EntityLabel,
    string FieldPath,
    TranslationStatus Status,
    string SourceText,
    string TargetText);

public enum ExportMode
{
    /// <summary>Include every translatable field regardless of state.</summary>
    All,
    /// <summary>Only fields where the target translation is empty.</summary>
    Missing,
    /// <summary>Empty target translations PLUS rows whose source has changed since last import.</summary>
    Outdated
}

/// <summary>Outcome for a single imported row in the validate response.</summary>
public record ImportRowReport(
    int LineNumber,
    string EntityType,
    string EntityId,
    string FieldPath,
    string Status,
    string? Message);

public record ImportValidationReport(
    int TotalRows,
    int Applicable,
    int Unchanged,
    int Skipped,
    int Errors,
    List<ImportRowReport> Issues);

public record ImportApplyReport(
    int Applied,
    int Skipped,
    int EntitiesTouched,
    List<ImportRowReport> Issues);
