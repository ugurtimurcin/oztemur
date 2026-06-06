using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Oztemur.API.Common.Models;

namespace Oztemur.API.Features.Storage;

public static class StorageEndpoints
{
    public static void MapStorageEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/storage").WithTags("Storage").RequireAuthorization();

        // ─── Upload File ─────────────────────────────────
        group.MapPost("/upload", async (IFormFile file, IConfiguration config, HttpContext ctx) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest(Result.Failure("No file was uploaded."));

            // Validate file type — images, documents, and hero-background videos.
            // SVG is deliberately excluded: it can carry <script> that the
            // browser executes when the file is served back as static content,
            // turning a single upload into a stored XSS vector.
            var allowedExtensions = new[]
            {
                ".jpg", ".jpeg", ".png", ".gif", ".webp",
                ".pdf", ".doc", ".docx",
                ".mp4", ".webm", ".mov", ".ogv", ".m4v",
            };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return Results.BadRequest(Result.Failure($"File type '{ext}' is not allowed."));

            // 100 MB cap — generous enough for short hero videos. Kestrel + the
            // form-options limit in Program.cs must allow at least this much.
            const long maxBytes = 100L * 1024 * 1024;
            if (file.Length > maxBytes)
                return Results.BadRequest(Result.Failure($"File size must be less than {maxBytes / (1024 * 1024)} MB."));

            // Magic-byte check rejects "evil.exe renamed to evil.jpg" — the
            // browser would happily execute the misnamed file when served
            // back as static content otherwise. Only images + PDF are
            // sniffed (see FileSignature for the rationale).
            using (var probe = file.OpenReadStream())
            {
                if (!await FileSignature.MatchesExtensionAsync(probe, ext))
                    return Results.BadRequest(Result.Failure(
                        $"Dosya içeriği uzantıyla eşleşmiyor ({ext}). Dosyanın gerçekten bir {ext} olduğundan emin olun."));
            }

            var basePath = config["Storage:MediaUploadPath"]!;
            if (!Directory.Exists(basePath))
                Directory.CreateDirectory(basePath);

            // Generate unique filename: yyyy/MM/uuid-original.ext
            var datePath = DateTime.UtcNow.ToString("yyyy/MM");
            var uploadDir = Path.Combine(basePath, datePath);
            if (!Directory.Exists(uploadDir))
                Directory.CreateDirectory(uploadDir);

            var uniqueName = $"{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadDir, uniqueName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            // Return the relative URL that the static file middleware will serve
            var relativeUrl = $"/uploads/{datePath}/{uniqueName}";

            return Results.Ok(Result<object>.Ok(new
            {
                url = relativeUrl,
                fileName = file.FileName,
                size = file.Length,
                contentType = file.ContentType
            }, "File uploaded successfully."));
        })
        .DisableAntiforgery();
    }
}
