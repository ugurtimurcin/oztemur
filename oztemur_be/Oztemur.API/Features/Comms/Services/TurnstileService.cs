using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Oztemur.API.Features.Comms.Services;

/// <summary>
/// Verifies Cloudflare Turnstile tokens submitted with public forms
/// (contact, job application). Configured via Turnstile:SecretKey in
/// appsettings; if no key is configured the verifier is a no-op so
/// development environments stay usable without an external dependency.
/// </summary>
public interface ITurnstileService
{
    /// <returns>True if verification passes (or is disabled).</returns>
    Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken ct = default);
}

public class TurnstileService : ITurnstileService
{
    private const string VerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private readonly HttpClient _http;
    private readonly string? _secretKey;
    private readonly ILogger<TurnstileService> _logger;

    public TurnstileService(HttpClient http, IConfiguration config, ILogger<TurnstileService> logger)
    {
        _http = http;
        _secretKey = config["Turnstile:SecretKey"];
        _logger = logger;
    }

    public async Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_secretKey))
        {
            // Verification disabled (no key configured). Useful for local dev.
            _logger.LogInformation("Turnstile verification skipped — no Turnstile:SecretKey configured.");
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Turnstile token missing on submission.");
            return false;
        }

        try
        {
            var formData = new Dictionary<string, string>
            {
                ["secret"] = _secretKey,
                ["response"] = token,
            };
            if (!string.IsNullOrWhiteSpace(remoteIp))
            {
                formData["remoteip"] = remoteIp;
            }

            using var content = new FormUrlEncodedContent(formData);
            var response = await _http.PostAsync(VerifyUrl, content, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Turnstile verify HTTP {Status}.", (int)response.StatusCode);
                return false;
            }

            var result = await response.Content.ReadFromJsonAsync<TurnstileResponse>(cancellationToken: ct);
            if (result?.Success != true)
            {
                _logger.LogWarning("Turnstile verification failed: {Errors}", string.Join(",", result?.ErrorCodes ?? Array.Empty<string>()));
            }
            return result?.Success ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Turnstile verify call threw — failing closed.");
            return false;
        }
    }

    private sealed record TurnstileResponse
    {
        [JsonPropertyName("success")] public bool Success { get; init; }
        [JsonPropertyName("error-codes")] public string[]? ErrorCodes { get; init; }
        [JsonPropertyName("hostname")] public string? Hostname { get; init; }
    }
}
