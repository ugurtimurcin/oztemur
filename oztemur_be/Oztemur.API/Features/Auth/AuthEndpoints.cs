using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Features.Auth.Services;

namespace Oztemur.API.Features.Auth;

public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
public record RefreshRequest(string RefreshToken);

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/login", async (LoginRequestDto req, IAuthService service) =>
        {
            var result = await service.LoginAsync(req);
            return result.Success
                ? Results.Ok(result)
                : Results.Json(result, statusCode: result.StatusCode);
        }).RequireRateLimiting("auth");

        group.MapPost("/register", async (RegisterRequestDto req, IAuthService service) =>
        {
            var result = await service.RegisterAsync(req);
            return result.Success
                ? Results.Ok(result)
                : Results.BadRequest(result);
        });

        // Refresh exchanges a long-lived refresh token for a new access +
        // refresh pair. Rate-limited under "auth" so a stolen token can't
        // be brute-rotated. The endpoint returns 401 on every failure mode
        // so the FE interceptor knows to redirect to /login.
        group.MapPost("/refresh", async (RefreshRequest req, IAuthService service) =>
        {
            var result = await service.RefreshAsync(req.RefreshToken ?? "");
            return result.Success
                ? Results.Ok(result)
                : Results.Json(result, statusCode: result.StatusCode);
        }).RequireRateLimiting("auth");

        // ─── Password reset flow ──────────────────────────
        // All three endpoints share the auth rate limiter (10 / 5min / IP)
        // so brute-forcing tokens or spamming forgot-password is throttled.
        // Forgot-password always returns success — see RequestPasswordResetAsync
        // for the account-enumeration rationale.
        group.MapPost("/forgot-password", async (ForgotPasswordRequest req, IAuthService service) =>
        {
            var result = await service.RequestPasswordResetAsync(req.Email ?? "");
            return Results.Ok(result);
        }).RequireRateLimiting("auth");

        group.MapGet("/validate-reset-token", async (string token, IAuthService service) =>
        {
            var result = await service.ValidatePasswordResetTokenAsync(token);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequireRateLimiting("auth");

        group.MapPost("/reset-password", async (ResetPasswordRequest req, IAuthService service) =>
        {
            var result = await service.ResetPasswordAsync(req.Token ?? "", req.NewPassword ?? "");
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequireRateLimiting("auth");
    }
}
