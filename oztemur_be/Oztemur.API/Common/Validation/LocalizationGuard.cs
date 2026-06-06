using System.Collections.Generic;
using System.Linq;

namespace Oztemur.API.Common.Validation;

/// <summary>
/// Enforces that localized content covers every published language. Mirrors
/// the admin-panel rule: when an entity carrying localized fields is created
/// or updated, each published (active) language must carry a value — so a
/// direct API call cannot bypass the front-end check.
/// </summary>
public static class LocalizationGuard
{
    /// <summary>
    /// Returns the published-language codes missing a non-empty value in at
    /// least one of the supplied required localized fields. Empty list = all
    /// languages complete.
    /// </summary>
    public static List<string> MissingLocales(
        IEnumerable<string> publishedCodes,
        params Dictionary<string, string>?[] requiredFields)
    {
        return publishedCodes
            .Where(code => requiredFields.Any(f =>
                f is null
                || !f.TryGetValue(code, out var v)
                || string.IsNullOrWhiteSpace(v)))
            .ToList();
    }
}
