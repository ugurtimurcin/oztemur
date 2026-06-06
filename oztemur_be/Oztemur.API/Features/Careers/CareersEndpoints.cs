using System;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Oztemur.API.Common.Models;
using Oztemur.API.Features.Careers.Services;
using Oztemur.API.Features.Comms.Services;

namespace Oztemur.API.Features.Careers;

public record JobApplicationDto(
    Guid JobRequisitionId,
    string CandidateName,
    string Email,
    string LinkedInUrl,
    string ExecutiveSummary,
    string Base64CvData,
    string? TurnstileToken
);

public static class CareersEndpoints
{
    public static void MapCareersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/careers").WithTags("HR & Careers");

        group.MapGet("/jobs", async (int pageNumber, int pageSize, string? lang, ICareersService service) =>
        {
            var result = await service.GetActiveJobsAsync(pageNumber < 1 ? 1 : pageNumber, pageSize < 1 ? 10 : pageSize, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapGet("/jobs/{id}", async (Guid id, string? lang, ICareersService service) =>
        {
            var result = await service.GetJobByIdAsync(id, lang ?? "tr");
            return result.Success ? Results.Ok(result) : Results.NotFound(result);
        });

        group.MapPost("/apply", async (
            JobApplicationDto req,
            ICareersService service,
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

            var result = await service.SubmitApplicationAsync(req);
            return result.Success ? Results.Ok(result) : Results.BadRequest(result);
        }).RequireRateLimiting("public-forms");
    }
}
