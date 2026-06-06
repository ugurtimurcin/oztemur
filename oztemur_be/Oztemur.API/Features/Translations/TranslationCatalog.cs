using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Translations;

/// <summary>
/// Knows how to enumerate every translatable field across every CMS entity
/// and how to write a translation back. The enumeration side feeds the CSV
/// export; the write side feeds the CSV import.
///
/// Field paths use a small dotted/bracketed grammar so a single string can
/// address nested structure: <c>Title</c>, <c>Timeline[2].Phase</c>,
/// <c>Fields.eyebrow</c>, <c>Requirements[0]</c>, <c>Value</c>.
/// </summary>
public static class TranslationCatalog
{
    public static readonly string[] EntityTypes =
    {
        "Project", "Company", "NewsArticle", "BlogPost",
        "JobRequisition", "LeadershipMember", "UiString", "PageSection"
    };

    // ─── ENUMERATE ───────────────────────────────────────────────────

    /// <summary>
    /// Build the full flat list of translatable fields for the given
    /// language pair. By default rows whose source-language text is empty
    /// are dropped — there is nothing for the translator to translate.
    /// When <paramref name="includeEmpty"/> is true (same-language bulk
    /// edit mode) blank rows are included so the admin can find and fill
    /// gaps in the source dictionary.
    /// </summary>
    public static async Task<List<TranslatableField>> EnumerateAsync(
        OztemurDbContext db, string sourceLang, string targetLang, bool includeEmpty = false)
    {
        var rows = new List<TranslatableField>(512);

        foreach (var p in await db.Projects.AsNoTracking().ToListAsync())
        {
            var label = Pick(p.Title, sourceLang) ?? p.Slug;
            AddDict(rows, "Project", p.Id, label, "Title", p.Title, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Project", p.Id, label, "Category", p.Category, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Project", p.Id, label, "Description", p.Description, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Project", p.Id, label, "LongDescription", p.LongDescription, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Project", p.Id, label, "Location", p.Location, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Project", p.Id, label, "Budget", p.Budget, sourceLang, targetLang, includeEmpty);
            for (int i = 0; i < p.Timeline.Count; i++)
            {
                var t = p.Timeline[i];
                AddDict(rows, "Project", p.Id, label, $"Timeline[{i}].Date", t.Date, sourceLang, targetLang, includeEmpty);
                AddDict(rows, "Project", p.Id, label, $"Timeline[{i}].Phase", t.Phase, sourceLang, targetLang, includeEmpty);
                AddDict(rows, "Project", p.Id, label, $"Timeline[{i}].Details", t.Details, sourceLang, targetLang, includeEmpty);
            }
        }

        foreach (var c in await db.Companies.AsNoTracking().ToListAsync())
        {
            var label = Pick(c.Name, sourceLang) ?? c.Id.ToString();
            AddDict(rows, "Company", c.Id, label, "Name", c.Name, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Company", c.Id, label, "Sector", c.Sector, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Company", c.Id, label, "Description", c.Description, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Company", c.Id, label, "DetailedDescription", c.DetailedDescription, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "Company", c.Id, label, "Address", c.Address, sourceLang, targetLang, includeEmpty);
        }

        foreach (var n in await db.NewsArticles.AsNoTracking().ToListAsync())
        {
            var label = Pick(n.Title, sourceLang) ?? n.Slug;
            AddDict(rows, "NewsArticle", n.Id, label, "Title", n.Title, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "NewsArticle", n.Id, label, "Summary", n.Summary, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "NewsArticle", n.Id, label, "Content", n.Content, sourceLang, targetLang, includeEmpty);
        }

        foreach (var b in await db.BlogPosts.AsNoTracking().ToListAsync())
        {
            var label = Pick(b.Title, sourceLang) ?? b.Slug;
            AddDict(rows, "BlogPost", b.Id, label, "Title", b.Title, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "BlogPost", b.Id, label, "Summary", b.Summary, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "BlogPost", b.Id, label, "Content", b.Content, sourceLang, targetLang, includeEmpty);
        }

        foreach (var j in await db.JobRequisitions.AsNoTracking().ToListAsync())
        {
            var label = Pick(j.Title, sourceLang) ?? j.ReferenceCode;
            AddDict(rows, "JobRequisition", j.Id, label, "Title", j.Title, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "JobRequisition", j.Id, label, "Department", j.Department, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "JobRequisition", j.Id, label, "Description", j.Description, sourceLang, targetLang, includeEmpty);

            // Requirements / CoreObjectives are Dictionary<lang, List<string>>.
            // We iterate over the SOURCE-language list and emit one row per
            // item; the translator's job is to produce a parallel list in
            // the target language.
            var srcReqs = j.Requirements != null && j.Requirements.TryGetValue(sourceLang, out var rs) ? rs : null;
            var tgtReqs = j.Requirements != null && j.Requirements.TryGetValue(targetLang, out var rt) ? rt : null;
            if (srcReqs != null)
            {
                for (int i = 0; i < srcReqs.Count; i++)
                {
                    var src = srcReqs[i];
                    if (string.IsNullOrWhiteSpace(src) && !includeEmpty) continue;
                    var tgt = tgtReqs != null && i < tgtReqs.Count ? tgtReqs[i] : null;
                    rows.Add(new TranslatableField("JobRequisition", j.Id, label, $"Requirements[{i}]", src ?? string.Empty, tgt));
                }
            }

            var srcCo = j.CoreObjectives != null && j.CoreObjectives.TryGetValue(sourceLang, out var cs) ? cs : null;
            var tgtCo = j.CoreObjectives != null && j.CoreObjectives.TryGetValue(targetLang, out var ct) ? ct : null;
            if (srcCo != null)
            {
                for (int i = 0; i < srcCo.Count; i++)
                {
                    var src = srcCo[i];
                    if (string.IsNullOrWhiteSpace(src) && !includeEmpty) continue;
                    var tgt = tgtCo != null && i < tgtCo.Count ? tgtCo[i] : null;
                    rows.Add(new TranslatableField("JobRequisition", j.Id, label, $"CoreObjectives[{i}]", src ?? string.Empty, tgt));
                }
            }
        }

        foreach (var l in await db.LeadershipMembers.AsNoTracking().ToListAsync())
        {
            var label = Pick(l.Name, sourceLang) ?? l.Slug;
            AddDict(rows, "LeadershipMember", l.Id, label, "Name", l.Name, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "LeadershipMember", l.Id, label, "Role", l.Role, sourceLang, targetLang, includeEmpty);
            AddDict(rows, "LeadershipMember", l.Id, label, "Bio", l.Bio, sourceLang, targetLang, includeEmpty);
        }

        foreach (var u in await db.UiStrings.AsNoTracking().ToListAsync())
        {
            // The Key doubles as the human-readable label — it's already a
            // short stable identifier like "common.read_more".
            AddDict(rows, "UiString", u.Id, u.Key, "Value", u.Values, sourceLang, targetLang, includeEmpty);
        }

        foreach (var s in await db.PageSections.AsNoTracking().ToListAsync())
        {
            var label = $"{s.PageKey}.{s.SectionKey}";
            foreach (var (fieldKey, perLang) in s.Fields)
            {
                if (perLang == null) continue;
                var src = perLang.TryGetValue(sourceLang, out var sv) ? sv : null;
                if (string.IsNullOrWhiteSpace(src) && !includeEmpty) continue;
                var tgt = perLang.TryGetValue(targetLang, out var tv) ? tv : null;
                rows.Add(new TranslatableField("PageSection", s.Id, label, $"Fields.{fieldKey}", src ?? string.Empty, tgt));
            }
        }

        return rows;
    }

    // ─── APPLY (write back) ──────────────────────────────────────────

    /// <summary>
    /// Apply a single translation to a tracked entity in memory. Returns
    /// the kind of update (no-op vs. real write) so the caller can decide
    /// whether to bump UpdatedAt. The path grammar must match exactly the
    /// strings produced by <see cref="EnumerateAsync"/>.
    /// </summary>
    public static ApplyResult Apply(object entity, string fieldPath, string targetLang, string value)
    {
        return entity switch
        {
            Project p => ApplyToProject(p, fieldPath, targetLang, value),
            Company c => ApplyToCompany(c, fieldPath, targetLang, value),
            NewsArticle n => ApplyToNews(n, fieldPath, targetLang, value),
            BlogPost b => ApplyToBlog(b, fieldPath, targetLang, value),
            JobRequisition j => ApplyToJob(j, fieldPath, targetLang, value),
            LeadershipMember l => ApplyToLeadership(l, fieldPath, targetLang, value),
            UiString u => ApplyToUiString(u, fieldPath, targetLang, value),
            PageSection s => ApplyToPageSection(s, fieldPath, targetLang, value),
            _ => ApplyResult.UnknownEntity
        };
    }

    public enum ApplyResult { Updated, NoChange, UnknownField, UnknownEntity, IndexOutOfRange }

    /// <summary>
    /// Mirror of <see cref="Apply"/> that returns the field's current value
    /// in the given language without mutating the entity. Used by the import
    /// planner to short-circuit rows whose new value equals what's already
    /// in the database — those rows count as "unchanged" and never reach
    /// the apply phase.
    /// </summary>
    public static string? ReadCurrent(object entity, string fieldPath, string targetLang) => entity switch
    {
        Project p          => ReadFromProject(p, fieldPath, targetLang),
        Company c          => ReadFromDict(GetCompanyDict(c, fieldPath), targetLang),
        NewsArticle n      => ReadFromDict(GetNewsDict(n, fieldPath), targetLang),
        BlogPost b         => ReadFromDict(GetBlogDict(b, fieldPath), targetLang),
        JobRequisition j   => ReadFromJob(j, fieldPath, targetLang),
        LeadershipMember l => ReadFromDict(GetLeadershipDict(l, fieldPath), targetLang),
        UiString u         => fieldPath == "Value" ? Pick(u.Values, targetLang) : null,
        PageSection s      => ReadFromPageSection(s, fieldPath, targetLang),
        _ => null
    };

    private static string? ReadFromDict(Dictionary<string, string>? dict, string lang)
        => dict != null && dict.TryGetValue(lang, out var v) ? v : null;

    private static Dictionary<string, string>? GetCompanyDict(Company c, string field) => field switch
    {
        "Name" => c.Name, "Sector" => c.Sector, "Description" => c.Description,
        "DetailedDescription" => c.DetailedDescription, "Address" => c.Address,
        _ => null
    };

    private static Dictionary<string, string>? GetNewsDict(NewsArticle n, string field) => field switch
    {
        "Title" => n.Title, "Summary" => n.Summary, "Content" => n.Content,
        _ => null
    };

    private static Dictionary<string, string>? GetBlogDict(BlogPost b, string field) => field switch
    {
        "Title" => b.Title, "Summary" => b.Summary, "Content" => b.Content,
        _ => null
    };

    private static Dictionary<string, string>? GetLeadershipDict(LeadershipMember l, string field) => field switch
    {
        "Name" => l.Name, "Role" => l.Role, "Bio" => l.Bio,
        _ => null
    };

    private static string? ReadFromProject(Project p, string field, string lang)
    {
        var direct = field switch
        {
            "Title"           => p.Title,
            "Category"        => p.Category,
            "Description"     => p.Description,
            "LongDescription" => p.LongDescription,
            "Location"        => p.Location,
            "Budget"          => p.Budget,
            _ => null
        };
        if (direct != null) return ReadFromDict(direct, lang);
        if (TryTimelineMatch(field, out var idx, out var sub))
        {
            if (idx < 0 || idx >= p.Timeline.Count) return null;
            var phase = p.Timeline[idx];
            var dict = sub switch
            {
                "Date"    => phase.Date,
                "Phase"   => phase.Phase,
                "Details" => phase.Details,
                _ => null
            };
            return ReadFromDict(dict, lang);
        }
        return null;
    }

    private static string? ReadFromJob(JobRequisition j, string field, string lang)
    {
        var direct = field switch
        {
            "Title"       => j.Title,
            "Department"  => j.Department,
            "Description" => j.Description,
            _ => null
        };
        if (direct != null) return ReadFromDict(direct, lang);
        if (TryListMatch(field, "Requirements", out var ri))
            return j.Requirements != null && j.Requirements.TryGetValue(lang, out var lr) && ri < lr.Count ? lr[ri] : null;
        if (TryListMatch(field, "CoreObjectives", out var ci))
            return j.CoreObjectives != null && j.CoreObjectives.TryGetValue(lang, out var lc) && ci < lc.Count ? lc[ci] : null;
        return null;
    }

    private static string? ReadFromPageSection(PageSection s, string field, string lang)
    {
        if (!field.StartsWith("Fields.", StringComparison.Ordinal)) return null;
        var key = field.Substring("Fields.".Length);
        return s.Fields.TryGetValue(key, out var inner) && inner != null && inner.TryGetValue(lang, out var v) ? v : null;
    }

    private static ApplyResult ApplyToProject(Project p, string field, string lang, string value)
    {
        switch (field)
        {
            case "Title":           p.Title           = Set(p.Title, lang, value);           return ApplyResult.Updated;
            case "Category":        p.Category        = Set(p.Category, lang, value);        return ApplyResult.Updated;
            case "Description":     p.Description     = Set(p.Description, lang, value);     return ApplyResult.Updated;
            case "LongDescription": p.LongDescription = Set(p.LongDescription, lang, value); return ApplyResult.Updated;
            case "Location":        p.Location        = Set(p.Location, lang, value);        return ApplyResult.Updated;
            case "Budget":          p.Budget          = Set(p.Budget, lang, value);          return ApplyResult.Updated;
        }
        if (TryTimelineMatch(field, out var idx, out var sub))
        {
            if (idx < 0 || idx >= p.Timeline.Count) return ApplyResult.IndexOutOfRange;
            // Replace the phase instance entirely so EF detects the change
            // to the JSONB column (mutating the inner dict alone isn't enough
            // — change tracking compares object references, not deep values).
            var current = p.Timeline[idx];
            ProjectTimelinePhase next = sub switch
            {
                "Date"    => new() { Date = Set(current.Date, lang, value),    Phase = current.Phase,                Details = current.Details },
                "Phase"   => new() { Date = current.Date,                      Phase = Set(current.Phase, lang, value), Details = current.Details },
                "Details" => new() { Date = current.Date,                      Phase = current.Phase,                Details = Set(current.Details, lang, value) },
                _ => current
            };
            if (ReferenceEquals(next, current)) return ApplyResult.UnknownField;
            // Reassign the list with a new reference so EF treats it as modified.
            var list = new List<ProjectTimelinePhase>(p.Timeline);
            list[idx] = next;
            p.Timeline = list;
            return ApplyResult.Updated;
        }
        return ApplyResult.UnknownField;
    }

    private static ApplyResult ApplyToCompany(Company c, string field, string lang, string value) => field switch
    {
        "Name"                => Set(c.Name,                lang, value, v => c.Name = v),
        "Sector"              => Set(c.Sector,              lang, value, v => c.Sector = v),
        "Description"         => Set(c.Description,         lang, value, v => c.Description = v),
        "DetailedDescription" => Set(c.DetailedDescription, lang, value, v => c.DetailedDescription = v),
        "Address"             => Set(c.Address,             lang, value, v => c.Address = v),
        _ => ApplyResult.UnknownField
    };

    private static ApplyResult ApplyToNews(NewsArticle n, string field, string lang, string value) => field switch
    {
        "Title"   => Set(n.Title,   lang, value, v => n.Title = v),
        "Summary" => Set(n.Summary, lang, value, v => n.Summary = v),
        "Content" => Set(n.Content, lang, value, v => n.Content = v),
        _ => ApplyResult.UnknownField
    };

    private static ApplyResult ApplyToBlog(BlogPost b, string field, string lang, string value) => field switch
    {
        "Title"   => Set(b.Title,   lang, value, v => b.Title = v),
        "Summary" => Set(b.Summary, lang, value, v => b.Summary = v),
        "Content" => Set(b.Content, lang, value, v => b.Content = v),
        _ => ApplyResult.UnknownField
    };

    private static ApplyResult ApplyToJob(JobRequisition j, string field, string lang, string value)
    {
        switch (field)
        {
            case "Title":       return Set(j.Title,       lang, value, v => j.Title = v);
            case "Department":  return Set(j.Department,  lang, value, v => j.Department = v);
            case "Description": return Set(j.Description, lang, value, v => j.Description = v);
        }
        if (TryListMatch(field, "Requirements", out var ri))
            return SetListItem(j.Requirements ??= new(), lang, ri, value, v => j.Requirements = v);
        if (TryListMatch(field, "CoreObjectives", out var ci))
            return SetListItem(j.CoreObjectives ??= new(), lang, ci, value, v => j.CoreObjectives = v);
        return ApplyResult.UnknownField;
    }

    private static ApplyResult ApplyToLeadership(LeadershipMember l, string field, string lang, string value) => field switch
    {
        "Name" => Set(l.Name, lang, value, v => l.Name = v),
        "Role" => Set(l.Role, lang, value, v => l.Role = v),
        "Bio"  => Set(l.Bio,  lang, value, v => l.Bio = v),
        _ => ApplyResult.UnknownField
    };

    private static ApplyResult ApplyToUiString(UiString u, string field, string lang, string value)
    {
        if (field != "Value") return ApplyResult.UnknownField;
        return Set(u.Values, lang, value, v => u.Values = v);
    }

    private static ApplyResult ApplyToPageSection(PageSection s, string field, string lang, string value)
    {
        if (!field.StartsWith("Fields.", StringComparison.Ordinal)) return ApplyResult.UnknownField;
        var key = field.Substring("Fields.".Length);
        if (string.IsNullOrEmpty(key)) return ApplyResult.UnknownField;

        // Replace the outer dict so EF sees the JSONB column as modified.
        var next = new Dictionary<string, Dictionary<string, string>>(s.Fields);
        if (!next.TryGetValue(key, out var inner) || inner == null)
            inner = new Dictionary<string, string>();
        else
            inner = new Dictionary<string, string>(inner);
        if (inner.TryGetValue(lang, out var existing) && existing == value)
            return ApplyResult.NoChange;
        inner[lang] = value;
        next[key] = inner;
        s.Fields = next;
        return ApplyResult.Updated;
    }

    // ─── helpers ─────────────────────────────────────────────────────

    private static void AddDict(List<TranslatableField> rows, string type, Guid id, string label,
        string fieldPath, Dictionary<string, string>? dict, string sourceLang, string targetLang, bool includeEmpty)
    {
        var src = Pick(dict, sourceLang);
        if (string.IsNullOrWhiteSpace(src) && !includeEmpty) return;
        var tgt = Pick(dict, targetLang);
        rows.Add(new TranslatableField(type, id, label, fieldPath, src ?? string.Empty, tgt));
    }

    private static string? Pick(Dictionary<string, string>? dict, string lang)
        => dict != null && dict.TryGetValue(lang, out var v) ? v : null;

    private static Dictionary<string, string> Set(Dictionary<string, string>? source, string lang, string value)
    {
        // Return a NEW dict instance so EF's reference comparison flags the
        // property as modified. Mutating the existing instance is invisible
        // to change tracking on JSONB columns.
        var d = source != null ? new Dictionary<string, string>(source) : new();
        d[lang] = value;
        return d;
    }

    private static ApplyResult Set(Dictionary<string, string>? source, string lang, string value, Action<Dictionary<string, string>> assign)
    {
        if (source != null && source.TryGetValue(lang, out var existing) && existing == value) return ApplyResult.NoChange;
        assign(Set(source, lang, value));
        return ApplyResult.Updated;
    }

    private static ApplyResult SetListItem(
        Dictionary<string, List<string>> dict, string lang, int index, string value,
        Action<Dictionary<string, List<string>>> assign)
    {
        if (index < 0) return ApplyResult.IndexOutOfRange;
        var next = new Dictionary<string, List<string>>(dict);
        next.TryGetValue(lang, out var list);
        var newList = list != null ? new List<string>(list) : new List<string>();
        // Pad with empties up to the target index so out-of-order rows still land.
        while (newList.Count <= index) newList.Add(string.Empty);
        if (newList[index] == value)
        {
            next[lang] = newList;
            assign(next);
            return ApplyResult.NoChange;
        }
        newList[index] = value;
        next[lang] = newList;
        assign(next);
        return ApplyResult.Updated;
    }

    private static readonly Regex TimelineRx = new(@"^Timeline\[(\d+)\]\.(Date|Phase|Details)$", RegexOptions.Compiled);
    private static bool TryTimelineMatch(string path, out int index, out string sub)
    {
        var m = TimelineRx.Match(path);
        if (!m.Success) { index = -1; sub = string.Empty; return false; }
        index = int.Parse(m.Groups[1].Value);
        sub = m.Groups[2].Value;
        return true;
    }

    private static bool TryListMatch(string path, string prefix, out int index)
    {
        index = -1;
        if (!path.StartsWith(prefix + "[", StringComparison.Ordinal)) return false;
        if (!path.EndsWith("]", StringComparison.Ordinal)) return false;
        var inside = path.Substring(prefix.Length + 1, path.Length - prefix.Length - 2);
        return int.TryParse(inside, out index);
    }
}
