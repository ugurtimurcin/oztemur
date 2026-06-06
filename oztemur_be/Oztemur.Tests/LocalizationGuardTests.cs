using System;
using System.Collections.Generic;
using Oztemur.API.Common.Validation;
using Xunit;

namespace Oztemur.Tests;

/// <summary>
/// Covers <see cref="LocalizationGuard"/> — the backend rule that every
/// published language must carry the required localized content.
/// </summary>
public class LocalizationGuardTests
{
    private static Dictionary<string, string> Field(params (string code, string value)[] entries)
    {
        var d = new Dictionary<string, string>();
        foreach (var (c, v) in entries) d[c] = v;
        return d;
    }

    [Fact]
    public void AllLanguagesFilled_ReturnsNoMissing()
    {
        var title = Field(("tr", "Başlık"), ("en", "Title"));
        Assert.Empty(LocalizationGuard.MissingLocales(new[] { "tr", "en" }, title));
    }

    [Fact]
    public void MissingLanguageKey_IsReported()
    {
        var title = Field(("tr", "Başlık")); // no "en"
        Assert.Equal(new[] { "en" }, LocalizationGuard.MissingLocales(new[] { "tr", "en" }, title));
    }

    [Fact]
    public void WhitespaceValue_CountsAsMissing()
    {
        var title = Field(("tr", "Başlık"), ("en", "   "));
        Assert.Equal(new[] { "en" }, LocalizationGuard.MissingLocales(new[] { "tr", "en" }, title));
    }

    [Fact]
    public void MultipleFields_AnyGapFlagsLanguage()
    {
        var title = Field(("tr", "Başlık"), ("en", "Title"));
        var body = Field(("tr", "Gövde")); // "en" missing in body
        Assert.Equal(new[] { "en" }, LocalizationGuard.MissingLocales(new[] { "tr", "en" }, title, body));
    }

    [Fact]
    public void NullField_FlagsEveryPublishedLanguage()
    {
        Assert.Equal(
            new[] { "tr", "en" },
            LocalizationGuard.MissingLocales(new[] { "tr", "en" }, (Dictionary<string, string>?)null));
    }

    [Fact]
    public void NoPublishedLanguages_ReturnsEmpty()
    {
        Assert.Empty(LocalizationGuard.MissingLocales(Array.Empty<string>(), Field(("tr", "x"))));
    }
}
