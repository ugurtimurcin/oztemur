using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Common.Models;
using Oztemur.API.Features.Comms.Services;

namespace Oztemur.API.Features.Comms;

public record ContactRequestDto(
    string Name,
    string Email,
    string Directorate,
    string Subject,
    string Message,
    string? TurnstileToken
);

public static class CommsEndpoints
{
    public static void MapCommsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/comms").WithTags("Communications");

        group.MapPost("/contact", async (
            ContactRequestDto req,
            ICommsService service,
            ITurnstileService turnstile,
            HttpContext http) =>
        {
            var ip = http.Connection.RemoteIpAddress?.ToString();
            var verified = await turnstile.VerifyAsync(req.TurnstileToken, ip, http.RequestAborted);
            if (!verified)
            {
                return Results.BadRequest(Result.Failure(
                    "Spam protection verification failed. Please reload and try again.",
                    statusCode: 400));
            }

            var result = await service.ProcessContactAsync(req);

            return result.Success
                ? Results.Ok(result)
                : Results.BadRequest(result);
        }).RequireRateLimiting("public-forms");
    }
}
