using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Oztemur.API.Common;

/// <summary>
/// Turkish-friendly URL slug generator. Maps Turkish-specific letters
/// (ı, ğ, ü, ş, ö, ç + capitals) to ASCII before falling back to the
/// generic Latin-1 diacritic strip, so "Şükrü Öztemür" becomes
/// "sukru-oztemur" instead of the broken "kr-ztemr".
/// </summary>
public static class Slug
{
    private static readonly Dictionary<char, string> TurkishMap = new()
    {
        ['ı'] = "i", ['İ'] = "i", ['ğ'] = "g", ['Ğ'] = "g",
        ['ü'] = "u", ['Ü'] = "u", ['ş'] = "s", ['Ş'] = "s",
        ['ö'] = "o", ['Ö'] = "o", ['ç'] = "c", ['Ç'] = "c",
    };

    public static string Generate(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var sb = new StringBuilder(input.Length);
        foreach (var ch in input)
        {
            if (TurkishMap.TryGetValue(ch, out var mapped)) sb.Append(mapped);
            else sb.Append(ch);
        }

        var normalized = sb.ToString().Normalize(NormalizationForm.FormD);
        var ascii = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                ascii.Append(ch);
        }

        var lowered = ascii.ToString().ToLowerInvariant();
        var slugged = Regex.Replace(lowered, "[^a-z0-9]+", "-");
        return slugged.Trim('-');
    }
}
