using Oztemur.API.Common.Models;
using Oztemur.API.Features.Auth.Services;

namespace Oztemur.API.Features.Auth;

public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);

public static class AuthEndpoints
{
    public const string RefreshCookieName = "oz_refresh";

    private const string RefreshCookiePath = "/api/auth";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/login", async (LoginRequestDto req, IAuthService service, HttpContext ctx, IHostEnvironment env) =>
        {
            var outcome = await service.LoginAsync(req);
            if (!outcome.Result.Success)
                return Results.Json(outcome.Result, statusCode: outcome.Result.StatusCode);
            SetRefreshCookie(ctx, env, outcome.RefreshToken!);
            return Results.Ok(outcome.Result);
        }).RequireRateLimiting("auth");

        group.MapPost("/register", async (RegisterRequestDto req, IAuthService service) =>
        {
            var result = await service.RegisterAsync(req);
            return result.Success
                ? Results.Ok(result)
                : Results.BadRequest(result);
        });

        group.MapPost("/refresh", async (IAuthService service, HttpContext ctx, IHostEnvironment env) =>
        {
            var refreshToken = ctx.Request.Cookies[RefreshCookieName] ?? string.Empty;
            var outcome = await service.RefreshAsync(refreshToken);
            if (!outcome.Result.Success)
            {
                ClearRefreshCookie(ctx);
                return Results.Json(outcome.Result, statusCode: outcome.Result.StatusCode);
            }
            SetRefreshCookie(ctx, env, outcome.RefreshToken!);
            return Results.Ok(outcome.Result);
        }).RequireRateLimiting("auth-refresh");

        group.MapPost("/logout", async (IAuthService service, HttpContext ctx) =>
        {
            var refreshToken = ctx.Request.Cookies[RefreshCookieName];
            if (!string.IsNullOrEmpty(refreshToken))
                await service.RevokeRefreshTokenAsync(refreshToken);
            ClearRefreshCookie(ctx);
            return Results.Ok(Result.Ok("Logged out."));
        });

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

    private static void SetRefreshCookie(HttpContext ctx, IHostEnvironment env, string token)
    {
        ctx.Response.Cookies.Append(RefreshCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = RefreshCookiePath,
            MaxAge = TimeSpan.FromDays(7),
        });
    }

    private static void ClearRefreshCookie(HttpContext ctx)
    {
        ctx.Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            Path = RefreshCookiePath,
        });
    }
}
