using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.SiteContent.Services;

public class SiteContentService : ISiteContentService
{
    private readonly IRepository<PageSection> _sections;
    private readonly IRepository<UiString> _strings;

    public SiteContentService(IRepository<PageSection> sections, IRepository<UiString> strings)
    {
        _sections = sections;
        _strings = strings;
    }

    /// <summary>Resolve a localized value with fallback to "tr" then any available language.</summary>
    private static string L(Dictionary<string, string>? dict, string lang, string fallback = "tr")
    {
        if (dict == null || dict.Count == 0) return string.Empty;
        if (dict.TryGetValue(lang, out var val) && !string.IsNullOrWhiteSpace(val)) return val;
        if (dict.TryGetValue(fallback, out var fb) && !string.IsNullOrWhiteSpace(fb)) return fb;
        return dict.Values.FirstOrDefault() ?? string.Empty;
    }

    public async Task<Result<Dictionary<string, Dictionary<string, string>>>> GetPageAsync(string pageKey, string lang = "tr")
    {
        var sections = await _sections.GetAsync(s => s.PageKey == pageKey && s.IsActive);

        var result = new Dictionary<string, Dictionary<string, string>>();
        foreach (var section in sections)
        {
            var resolved = new Dictionary<string, string>();
            foreach (var (fieldKey, valuesByLang) in section.Fields)
            {
                resolved[fieldKey] = L(valuesByLang, lang);
            }
            result[section.SectionKey] = resolved;
        }

        return Result<Dictionary<string, Dictionary<string, string>>>.Ok(result);
    }

    public async Task<Result<Dictionary<string, string>>> GetUiStringsAsync(string lang = "tr", string? group = null)
    {
        var strings = string.IsNullOrWhiteSpace(group)
            ? await _strings.GetAllAsync()
            : await _strings.GetAsync(s => s.Group == group);

        var result = strings.ToDictionary(s => s.Key, s => L(s.Values, lang));
        return Result<Dictionary<string, string>>.Ok(result);
    }
}
