using Microsoft.AspNetCore.DataProtection;

namespace Oztemur.API.Features.Email;

/// <summary>
/// Thin wrapper around <see cref="IDataProtector"/> with a fixed purpose
/// string so the SMTP password's ciphertext can't be silently decrypted by
/// some other component that happens to call DataProtection.
/// </summary>
public class EmailPasswordProtector
{
    private readonly IDataProtector _protector;

    public EmailPasswordProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("Oztemur.EmailSettings.SmtpPassword.v1");
    }

    public string Protect(string plaintext) =>
        string.IsNullOrEmpty(plaintext) ? string.Empty : _protector.Protect(plaintext);

    /// <summary>
    /// Returns the plaintext password or null when the ciphertext is empty /
    /// unreadable (e.g. DataProtection keys rotated and old ciphertext can't
    /// be decrypted). Callers should treat null as "not configured".
    /// </summary>
    public string? TryUnprotect(string ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext)) return null;
        try { return _protector.Unprotect(ciphertext); }
        catch { return null; }
    }
}
