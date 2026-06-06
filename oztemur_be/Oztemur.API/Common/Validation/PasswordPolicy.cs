using System.Linq;

namespace Oztemur.API.Common.Validation;

/// <summary>Minimum password strength rules applied to every account creation.</summary>
public static class PasswordPolicy
{
    public const int MinLength = 10;

    // Short, curated blacklist of the most common weak passwords. Catches
    // the dumb cases ("Password1", "qwerty123", etc.) without pulling in a
    // 100k-word dictionary. Case-insensitive comparison.
    private static readonly HashSet<string> CommonWeakPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1", "password123", "pass1234",
        "qwerty", "qwerty123", "qwertyuiop",
        "12345678", "123456789", "1234567890",
        "abcdefgh", "abcd1234", "abc12345",
        "admin", "admin123", "administrator",
        "welcome", "welcome1", "welcome123",
        "letmein", "iloveyou", "monkey", "dragon", "master",
        "sunshine", "princess", "football", "baseball",
        "öztemur", "oztemur", "oztemur123", "oztemur1",
        "turkiye", "türkiye", "istanbul", "ankara",
    };

    /// <summary>
    /// Returns a human-readable error if the password is too weak, otherwise null.
    /// </summary>
    public static string? Validate(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinLength)
            return $"Şifre en az {MinLength} karakter olmalı.";

        if (!password.Any(char.IsUpper))
            return "Şifre en az bir büyük harf içermeli.";

        if (!password.Any(char.IsLower))
            return "Şifre en az bir küçük harf içermeli.";

        if (!password.Any(char.IsDigit))
            return "Şifre en az bir rakam içermeli.";

        if (CommonWeakPasswords.Contains(password))
            return "Bu şifre çok yaygın kullanıldığı için kabul edilmiyor. Lütfen başka bir şifre seçin.";

        return null;
    }
}
