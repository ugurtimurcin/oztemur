using System.Collections.Generic;
using System.Threading.Tasks;
using Oztemur.API.Common.Models;

namespace Oztemur.API.Features.SiteContent.Services;

public interface ISiteContentService
{
    /// <summary>
    /// Returns the resolved content for every section of a page in a single response:
    ///   { sectionKey: { fieldKey: localizedString, ... }, ... }
    /// </summary>
    Task<Result<Dictionary<string, Dictionary<string, string>>>> GetPageAsync(string pageKey, string lang = "tr");

    /// <summary>
    /// Returns a flat map of UI strings, optionally filtered by group:
    ///   { "common.read_more": "Read more", ... }
    /// </summary>
    Task<Result<Dictionary<string, string>>> GetUiStringsAsync(string lang = "tr", string? group = null);
}
