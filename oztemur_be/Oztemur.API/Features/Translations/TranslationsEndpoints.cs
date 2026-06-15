using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Translations;

/// <summary>Wraps an uploaded xlsx as base64 so it can travel inside the
/// existing JSON apiFetch path on the admin client.</summary>
public record TranslationsXlsxBody(string XlsxBase64);

public static class TranslationsEndpoints
{
    public static void MapTranslationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/translations")
            .WithTags("Admin Translations")
            .RequireAuthorization();

        // ─── EXPORT (.xlsx) ─────────────────────────────────────────
        group.MapGet("/export", async (
            OztemurDbContext db,
            string target,
            string? mode) =>
        {
            target = (target ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(target))
                return Results.BadRequest(Result.Failure("Target language is required."));

            var defaultLang = await db.Languages.Where(l => l.IsDefault).Select(l => l.Code).FirstOrDefaultAsync() ?? "tr";
            var langExists = await db.Languages.AnyAsync(l => l.Code == target);
            if (!langExists)
                return Results.NotFound(Result.Failure($"Language '{target}' does not exist."));

            // Same-language mode is a deliberate bulk-edit affordance — admin
            // exports the source dictionary, edits in Excel, re-imports.
            // Include empty rows in this mode so the admin can find and fill
            // blank source fields; in cross-language mode they get skipped
            // because there is nothing for the translator to translate FROM.
            var sameLanguage = string.Equals(target, defaultLang, StringComparison.OrdinalIgnoreCase);
            var fields = await TranslationCatalog.EnumerateAsync(db, defaultLang, target, includeEmpty: sameLanguage);
            var hashes = sameLanguage
                ? new Dictionary<(string, Guid, string), string>()
                : await LoadHashesAsync(db, target);
            var backfill = sameLanguage ? null : new List<TranslationSourceHash>();
            var rows = BuildRows(fields, hashes, sameLanguage, backfill, sameLanguage ? null : target);
            if (backfill != null) await FlushBackfillAsync(db, backfill);

            var exportMode = ParseMode(mode);
            var filtered = exportMode switch
            {
                ExportMode.Missing => rows.Where(r => r.Status == TranslationStatus.Missing).ToList(),
                ExportMode.Outdated => rows.Where(r => r.Status != TranslationStatus.UpToDate).ToList(),
                _ => rows
            };

            var bytes = TranslationsXlsx.Write(defaultLang, target, filtered);
            var stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmm");
            var fileName = $"oztemur-translations-{target}-{exportMode.ToString().ToLowerInvariant()}-{stamp}.xlsx";
            return Results.File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }).RequirePermission("sitecontent.edit");

        // ─── SUMMARY (header chips) ─────────────────────────────────
        group.MapGet("/summary", async (
            OztemurDbContext db,
            string target) =>
        {
            target = (target ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(target))
                return Results.BadRequest(Result.Failure("Target language is required."));

            var defaultLang = await db.Languages.Where(l => l.IsDefault).Select(l => l.Code).FirstOrDefaultAsync() ?? "tr";
            var sameLanguage = string.Equals(target, defaultLang, StringComparison.OrdinalIgnoreCase);
            var fields = await TranslationCatalog.EnumerateAsync(db, defaultLang, target, includeEmpty: sameLanguage);
            var hashes = sameLanguage
                ? new Dictionary<(string, Guid, string), string>()
                : await LoadHashesAsync(db, target);
            var backfill = sameLanguage ? null : new List<TranslationSourceHash>();
            var rows = BuildRows(fields, hashes, sameLanguage, backfill, sameLanguage ? null : target);
            if (backfill != null) await FlushBackfillAsync(db, backfill);
            var summary = new
            {
                target,
                source = defaultLang,
                sameLanguage,
                total = rows.Count,
                missing = rows.Count(r => r.Status == TranslationStatus.Missing),
                stale = rows.Count(r => r.Status == TranslationStatus.Stale),
                upToDate = rows.Count(r => r.Status == TranslationStatus.UpToDate),
            };
            return Results.Ok(Result<object>.Ok(summary));
        }).RequirePermission("sitecontent.view");

        // ─── IMPORT — validate (dry-run, no writes) ─────────────────
        group.MapPost("/import/validate", async (
            TranslationsXlsxBody body,
            OztemurDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(body?.XlsxBase64))
                return Results.BadRequest(Result.Failure("Workbook upload is required."));

            ImportPlan plan;
            try { plan = await BuildPlanAsync(db, body.XlsxBase64); }
            catch (FormatException ex) { return Results.BadRequest(Result.Failure(ex.Message)); }

            var report = new ImportValidationReport(
                TotalRows: plan.TotalRows,
                Applicable: plan.Operations.Count,
                Unchanged: plan.Unchanged,
                Skipped: plan.Issues.Count(i => i.Status == "skipped"),
                Errors: plan.Issues.Count(i => i.Status == "error"),
                Issues: plan.Issues);
            return Results.Ok(Result<ImportValidationReport>.Ok(report));
        }).RequirePermission("sitecontent.edit");

        // ─── IMPORT — apply (real writes) ───────────────────────────
        group.MapPost("/import/apply", async (
            TranslationsXlsxBody body,
            OztemurDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(body?.XlsxBase64))
                return Results.BadRequest(Result.Failure("Workbook upload is required."));

            ImportPlan plan;
            try { plan = await BuildPlanAsync(db, body.XlsxBase64); }
            catch (FormatException ex) { return Results.BadRequest(Result.Failure(ex.Message)); }

            int applied = 0;
            var touched = new HashSet<(string type, Guid id)>();
            // Same-language imports rewrite the source dictionary itself —
            // there's no "translation to track", so we skip the hash table
            // entirely. Other languages' hashes for those fields will be
            // detected as stale on their next export, which is the correct
            // signal (TR changed, AR translation is now based on old TR).
            var sameLanguage = string.Equals(plan.TargetLang, plan.SourceLang, StringComparison.OrdinalIgnoreCase);
            var hashIndex = sameLanguage
                ? new Dictionary<(string EntityType, Guid EntityId, string FieldPath), TranslationSourceHash>()
                : await db.TranslationSourceHashes
                    .Where(h => h.TargetLanguage == plan.TargetLang)
                    .ToDictionaryAsync(h => (h.EntityType, h.EntityId, h.FieldPath));

            foreach (var op in plan.Operations)
            {
                var result = TranslationCatalog.Apply(op.Entity, op.FieldPath, plan.TargetLang, op.NewValue);
                if (result == TranslationCatalog.ApplyResult.Updated)
                {
                    applied++;
                    touched.Add((op.EntityType, op.EntityId));
                    if (!sameLanguage)
                        UpsertHash(db, hashIndex, op.EntityType, op.EntityId, op.FieldPath, plan.TargetLang, op.SourceText);
                }
                else if (result == TranslationCatalog.ApplyResult.NoChange)
                {
                    if (!sameLanguage)
                        UpsertHash(db, hashIndex, op.EntityType, op.EntityId, op.FieldPath, plan.TargetLang, op.SourceText);
                }
                else
                {
                    plan.Issues.Add(new ImportRowReport(op.LineNumber, op.EntityType, op.EntityId.ToString(),
                        op.FieldPath, "error", result.ToString()));
                }
            }

            await db.SaveChangesAsync();

            var report = new ImportApplyReport(
                Applied: applied,
                Skipped: plan.Issues.Count(i => i.Status == "skipped"),
                EntitiesTouched: touched.Count,
                Issues: plan.Issues);
            return Results.Ok(Result<ImportApplyReport>.Ok(report, "Import applied."));
        }).RequirePermission("sitecontent.edit");
    }

    // ─── helpers ─────────────────────────────────────────────────────

    private static ExportMode ParseMode(string? raw) => (raw ?? "").Trim().ToLowerInvariant() switch
    {
        "missing" => ExportMode.Missing,
        "outdated" or "stale" => ExportMode.Outdated,
        _ => ExportMode.All
    };

    private static List<TranslationRow> BuildRows(
        List<TranslatableField> fields,
        Dictionary<(string, Guid, string), string> hashes,
        bool sameLanguage,
        List<TranslationSourceHash>? backfillSink = null,
        string? targetLang = null)
    {
        var output = new List<TranslationRow>(fields.Count);
        foreach (var f in fields)
        {
            TranslationStatus status;
            if (sameLanguage)
            {
                // Single-language bulk-edit: there is no source/target split.
                // The only meaningful state per row is "has content" vs "blank".
                status = string.IsNullOrWhiteSpace(f.SourceText)
                    ? TranslationStatus.Missing
                    : TranslationStatus.UpToDate;
            }
            else if (string.IsNullOrWhiteSpace(f.TargetText))
            {
                status = TranslationStatus.Missing;
            }
            else
            {
                var key = (f.EntityType, f.EntityId, f.FieldPath);
                var currentHash = TranslationsXlsx.HashSource(f.SourceText);
                if (hashes.TryGetValue(key, out var stored))
                {
                    status = stored == currentHash
                        ? TranslationStatus.UpToDate
                        : TranslationStatus.Stale;
                }
                else if (backfillSink != null && targetLang != null)
                {
                    backfillSink.Add(new TranslationSourceHash
                    {
                        EntityType = f.EntityType,
                        EntityId = f.EntityId,
                        FieldPath = f.FieldPath,
                        TargetLanguage = targetLang,
                        SourceHash = currentHash,
                    });
                    hashes[key] = currentHash;
                    status = TranslationStatus.UpToDate;
                }
                else
                {
                    status = TranslationStatus.Stale;
                }
            }
            output.Add(new TranslationRow(
                f.EntityType, f.EntityId, f.EntityLabel, f.FieldPath, status,
                f.SourceText, f.TargetText ?? string.Empty));
        }
        return output;
    }

    private static async Task FlushBackfillAsync(OztemurDbContext db, List<TranslationSourceHash> backfill)
    {
        if (backfill.Count == 0) return;
        db.TranslationSourceHashes.AddRange(backfill);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException)
        {
        }
    }

    private static async Task<Dictionary<(string, Guid, string), string>> LoadHashesAsync(
        OztemurDbContext db, string targetLang)
    {
        return await db.TranslationSourceHashes
            .Where(h => h.TargetLanguage == targetLang)
            .ToDictionaryAsync(h => (h.EntityType, h.EntityId, h.FieldPath), h => h.SourceHash);
    }

    private static async Task<ImportPlan> BuildPlanAsync(OztemurDbContext db, string base64)
    {
        byte[] bytes;
        try { bytes = Convert.FromBase64String(base64); }
        catch (FormatException) { throw new FormatException("Uploaded workbook is not valid base64."); }

        var parsed = TranslationsXlsx.Read(bytes, out var sourceLang, out var targetLang);

        var issues = new List<ImportRowReport>();
        var ops = new List<ImportOp>();
        int unchanged = 0;

        var defaultLang = await db.Languages.Where(l => l.IsDefault).Select(l => l.Code).FirstOrDefaultAsync() ?? "tr";

        // We allow the workbook to be silent about source/target — fall back
        // to the default. If it IS specified and disagrees, refuse.
        if (!string.IsNullOrEmpty(sourceLang) && !string.Equals(sourceLang, defaultLang, StringComparison.OrdinalIgnoreCase))
            throw new FormatException(
                $"Workbook source language '{sourceLang}' does not match the default language '{defaultLang}'.");
        if (string.IsNullOrEmpty(targetLang))
            throw new FormatException("Workbook is missing the target language in its header.");
        var targetExists = await db.Languages.AnyAsync(l => l.Code == targetLang);
        if (!targetExists)
            throw new FormatException($"Workbook target language '{targetLang}' is not registered.");

        var groups = parsed
            .Where(r => Guid.TryParse(r.EntityId, out _))
            .GroupBy(r => (r.EntityType, EntityId: Guid.Parse(r.EntityId)));

        foreach (var g in groups)
        {
            var entity = await LoadEntityAsync(db, g.Key.EntityType, g.Key.EntityId);
            if (entity == null)
            {
                foreach (var r in g)
                    issues.Add(new ImportRowReport(r.ExcelRow, r.EntityType, r.EntityId, r.FieldPath, "skipped",
                        "Entity no longer exists."));
                continue;
            }

            foreach (var r in g)
            {
                var newValue = (r.Target ?? string.Empty).Trim();
                if (string.IsNullOrEmpty(newValue))
                {
                    issues.Add(new ImportRowReport(r.ExcelRow, r.EntityType, r.EntityId, r.FieldPath, "skipped",
                        "Target is empty."));
                    continue;
                }

                // Compare against the current DB value before queueing. If
                // they match exactly, the translator left the cell alone —
                // count as unchanged and skip both the apply write AND the
                // hash refresh. Saves churn in the audit log and gives the
                // validate report an honest "X rows already match" number.
                var current = TranslationCatalog.ReadCurrent(entity, r.FieldPath, targetLang) ?? string.Empty;
                if (string.Equals(current, newValue, StringComparison.Ordinal))
                {
                    unchanged++;
                    continue;
                }

                ops.Add(new ImportOp(
                    LineNumber: r.ExcelRow,
                    EntityType: r.EntityType,
                    EntityId: g.Key.EntityId,
                    Entity: entity,
                    FieldPath: r.FieldPath,
                    SourceText: r.Source ?? string.Empty,
                    NewValue: newValue));
            }
        }

        foreach (var bad in parsed.Where(r => !Guid.TryParse(r.EntityId, out _)))
            issues.Add(new ImportRowReport(bad.ExcelRow, bad.EntityType, bad.EntityId, bad.FieldPath, "error",
                "Entity id is not a valid GUID."));

        return new ImportPlan(parsed.Count, ops, issues, unchanged, defaultLang, targetLang);
    }

    private static async Task<object?> LoadEntityAsync(OztemurDbContext db, string entityType, Guid id) => entityType switch
    {
        "Project"          => await db.Projects.FirstOrDefaultAsync(e => e.Id == id),
        "Company"          => await db.Companies.FirstOrDefaultAsync(e => e.Id == id),
        "NewsArticle"      => await db.NewsArticles.FirstOrDefaultAsync(e => e.Id == id),
        "BlogPost"         => await db.BlogPosts.FirstOrDefaultAsync(e => e.Id == id),
        "JobRequisition"   => await db.JobRequisitions.FirstOrDefaultAsync(e => e.Id == id),
        "LeadershipMember" => await db.LeadershipMembers.FirstOrDefaultAsync(e => e.Id == id),
        "UiString"         => await db.UiStrings.FirstOrDefaultAsync(e => e.Id == id),
        "PageSection"      => await db.PageSections.FirstOrDefaultAsync(e => e.Id == id),
        _ => null
    };

    private static void UpsertHash(
        OztemurDbContext db,
        Dictionary<(string EntityType, Guid EntityId, string FieldPath), TranslationSourceHash> index,
        string entityType, Guid entityId, string fieldPath, string targetLang, string sourceText)
    {
        var hash = TranslationsXlsx.HashSource(sourceText);
        if (index.TryGetValue((entityType, entityId, fieldPath), out var existing))
        {
            if (existing.SourceHash != hash)
            {
                existing.SourceHash = hash;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }
        else
        {
            var row = new TranslationSourceHash
            {
                EntityType = entityType,
                EntityId = entityId,
                FieldPath = fieldPath,
                TargetLanguage = targetLang,
                SourceHash = hash
            };
            db.TranslationSourceHashes.Add(row);
            index[(entityType, entityId, fieldPath)] = row;
        }
    }

    private record ImportOp(
        int LineNumber,
        string EntityType,
        Guid EntityId,
        object Entity,
        string FieldPath,
        string SourceText,
        string NewValue);

    private record ImportPlan(
        int TotalRows,
        List<ImportOp> Operations,
        List<ImportRowReport> Issues,
        int Unchanged,
        string SourceLang,
        string TargetLang);
}
