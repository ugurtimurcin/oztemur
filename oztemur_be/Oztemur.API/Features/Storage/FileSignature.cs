namespace Oztemur.API.Features.Storage;

/// <summary>
/// Validates that an uploaded file's actual binary header matches its
/// claimed extension. Stops the "evil.exe renamed to evil.jpg" trick where
/// the static middleware would happily serve the file as image/jpeg and a
/// link to it could be used in phishing or to bypass content scanners.
/// </summary>
/// <remarks>
/// Only images and PDF are checked here because their signatures are stable
/// and well-defined. Office documents and video containers have looser
/// formats — covering them properly needs a real MIME-detection library;
/// extension whitelist remains the only defence for those.
/// </remarks>
public static class FileSignature
{
    /// <summary>
    /// Returns true when the file's first bytes match the signature expected
    /// for <paramref name="extension"/>. Returns true for extensions we
    /// don't sniff (lets them pass through to the extension whitelist).
    /// </summary>
    public static async Task<bool> MatchesExtensionAsync(Stream stream, string extension, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(extension)) return false;

        // Read enough bytes for the longest signature we check (12 for WebP).
        var buffer = new byte[12];
        var originalPosition = stream.Position;
        try
        {
            stream.Position = 0;
            var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), ct);
            if (read == 0) return false;

            return extension.ToLowerInvariant() switch
            {
                ".jpg" or ".jpeg" => StartsWith(buffer, read, 0xFF, 0xD8, 0xFF),
                ".png"            => StartsWith(buffer, read, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
                ".gif"            => StartsWith(buffer, read, 0x47, 0x49, 0x46, 0x38),                            // GIF8
                ".webp"           => StartsWith(buffer, read, 0x52, 0x49, 0x46, 0x46)                             // "RIFF"
                                     && read >= 12
                                     && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50, // "WEBP"
                ".pdf"            => StartsWith(buffer, read, 0x25, 0x50, 0x44, 0x46),                            // "%PDF"
                // Video + Office formats fall through — extension whitelist
                // covers them; signature is too variable to check inline.
                _                 => true,
            };
        }
        finally
        {
            stream.Position = originalPosition;
        }
    }

    private static bool StartsWith(byte[] buffer, int read, params byte[] signature)
    {
        if (read < signature.Length) return false;
        for (int i = 0; i < signature.Length; i++)
            if (buffer[i] != signature[i]) return false;
        return true;
    }
}
