using System.Text.RegularExpressions;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Domain.Enums;
using Oztemur.API.Features.Notifications.Services;
using Oztemur.API.Infrastructure.Repositories;

using Oztemur.API.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace Oztemur.API.Features.Careers.Services;

public partial class CareersService : ICareersService
{
    private const int MaxCandidateNameLength = 120;
    private const int MaxEmailLength = 254;
    private const int MaxLinkedInUrlLength = 200;
    private const int MaxExecutiveSummaryLength = 5000;

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase)]
    private static partial Regex EmailRegex();
    private readonly IRepository<JobRequisition> _jobRepo;
    private readonly IRepository<JobApplication> _appRepo;
    private readonly IConfiguration _configuration;
    private readonly OztemurDbContext _dbContext;
    private readonly INotificationService _notifications;

    public CareersService(IRepository<JobRequisition> jobRepo, IRepository<JobApplication> appRepo, IConfiguration configuration, OztemurDbContext dbContext, INotificationService notifications)
    {
        _jobRepo = jobRepo;
        _appRepo = appRepo;
        _configuration = configuration;
        _dbContext = dbContext;
        _notifications = notifications;
    }

    private static string L(Dictionary<string, string>? dict, string lang, string fallback = "tr")
    {
        if (dict == null || dict.Count == 0) return string.Empty;
        if (dict.TryGetValue(lang, out var val) && !string.IsNullOrWhiteSpace(val)) return val;
        if (dict.TryGetValue(fallback, out var fb) && !string.IsNullOrWhiteSpace(fb)) return fb;
        return dict.Values.FirstOrDefault() ?? string.Empty;
    }

    private static List<string> LList(Dictionary<string, List<string>>? dict, string lang, string fallback = "tr")
    {
        if (dict == null || dict.Count == 0) return new List<string>();
        if (dict.TryGetValue(lang, out var val) && val.Any()) return val;
        if (dict.TryGetValue(fallback, out var fb) && fb.Any()) return fb;
        return dict.Values.FirstOrDefault() ?? new List<string>();
    }

    public async Task<Result<PagedResult<object>>> GetActiveJobsAsync(int pageNumber, int pageSize, string lang = "tr")
    {
        var (items, totalCount) = await _jobRepo.GetPagedAsync(pageNumber, pageSize, j => j.IsActive);
        
        var dtos = items.Select(j => new { 
            j.Id, j.ReferenceCode, 
            Title = L(j.Title, lang), 
            Department = L(j.Department, lang), 
            j.Location, j.Type, 
            Description = L(j.Description, lang), 
            Requirements = LList(j.Requirements, lang),
            CoreObjectives = LList(j.CoreObjectives, lang) 
        }).Cast<object>().ToList();

        var pagedResult = new PagedResult<object>(dtos, totalCount, pageNumber, pageSize);
        return Result<PagedResult<object>>.Ok(pagedResult);
    }

    public async Task<Result<object>> GetJobByIdAsync(Guid id, string lang = "tr")
    {
        var job = await _jobRepo.GetByIdAsync(id);
        if (job == null || !job.IsActive)
            return Result<object>.Failure("Job requisition not found or inactive.");

        var dto = new { 
            job.Id, job.ReferenceCode, 
            Title = L(job.Title, lang), 
            Department = L(job.Department, lang), 
            job.Location, job.Type, 
            Description = L(job.Description, lang), 
            Requirements = LList(job.Requirements, lang),
            CoreObjectives = LList(job.CoreObjectives, lang) 
        };
        return Result<object>.Ok(dto);
    }

    public async Task<Result> SubmitApplicationAsync(JobApplicationDto request)
    {
        var targetJob = await _jobRepo.GetByIdAsync(request.JobRequisitionId);
        if (targetJob == null || !targetJob.IsActive)
        {
            return Result.Failure("Target job requisition does not exist or is no longer active.");
        }

        var candidateName    = (request.CandidateName ?? string.Empty).Trim();
        var email            = (request.Email ?? string.Empty).Trim();
        var linkedInUrl      = (request.LinkedInUrl ?? string.Empty).Trim();
        var executiveSummary = (request.ExecutiveSummary ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(candidateName) || candidateName.Length > MaxCandidateNameLength)
            return Result.Failure("Candidate name is required and must be under 120 characters.");
        if (string.IsNullOrEmpty(email) || email.Length > MaxEmailLength || !EmailRegex().IsMatch(email))
            return Result.Failure("A valid email address is required.");
        if (executiveSummary.Length > MaxExecutiveSummaryLength)
            return Result.Failure($"Executive summary must be under {MaxExecutiveSummaryLength} characters.");

        if (!string.IsNullOrEmpty(linkedInUrl))
        {
            if (linkedInUrl.Length > MaxLinkedInUrlLength
                || !Uri.TryCreate(linkedInUrl, UriKind.Absolute, out var parsedLi)
                || (parsedLi.Scheme != Uri.UriSchemeHttp && parsedLi.Scheme != Uri.UriSchemeHttps)
                || !parsedLi.Host.EndsWith("linkedin.com", StringComparison.OrdinalIgnoreCase))
            {
                return Result.Failure("LinkedIn URL must be a valid linkedin.com profile address.");
            }
        }

        var basePath = _configuration["Storage:CvUploadPath"] ?? "/var/oztemur/cvs";
        
        // Ensure the directory physical structure physically exists before writing
        if (!System.IO.Directory.Exists(basePath))
        {
            System.IO.Directory.CreateDirectory(basePath);
        }

        string cvBlobPath = string.Empty;
        if (!string.IsNullOrWhiteSpace(request.Base64CvData))
        {
            byte[] fileBytes;
            try
            {
                // Strip Data-URI prefix if the frontend sends it formatted natively
                var base64Clean = request.Base64CvData.Contains(",")
                    ? request.Base64CvData.Split(',')[1]
                    : request.Base64CvData;
                fileBytes = System.Convert.FromBase64String(base64Clean);
            }
            catch (System.FormatException)
            {
                return Result.Failure("Invalid CV payload format. Base64 encoding is explicitly required.");
            }

            const int maxCvBytes = 10 * 1024 * 1024; // 10 MB
            if (fileBytes.Length > maxCvBytes)
                return Result.Failure("CV file is too large. The maximum allowed size is 10 MB.");

            // Verify the bytes really are a PDF ("%PDF" magic). The client-side
            // accept=".pdf" filter is advisory only and trivially bypassed.
            if (fileBytes.Length < 5 ||
                fileBytes[0] != 0x25 || fileBytes[1] != 0x50 ||
                fileBytes[2] != 0x44 || fileBytes[3] != 0x46)
                return Result.Failure("CV must be a valid PDF file.");

            var fileName = $"{Guid.NewGuid()}.pdf";
            cvBlobPath = System.IO.Path.Combine(basePath, fileName);
            await System.IO.File.WriteAllBytesAsync(cvBlobPath, fileBytes);
        }

        var appData = new JobApplication
        {
            JobRequisitionId = request.JobRequisitionId,
            CandidateName = candidateName,
            Email = email,
            LinkedInUrl = linkedInUrl,
            ExecutiveSummary = executiveSummary,
            CvBlobPath = cvBlobPath
        };

        await _appRepo.AddAsync(appData);

        // Notify every admin with any applications.* permission.
        await _notifications.CreateAsync(
            permissionArea: "applications",
            type: "job_application",
            title: "New job application",
            message: $"{candidateName} · {L(targetJob.Title, "tr")}",
            link: $"/applications/{appData.Id}",
            entityId: appData.Id);

        return Result.Ok($"Application for {candidateName} submitted successfully.");
    }

    public async Task<Result<JobRequisition>> CreateJobAsync(Dictionary<string, string> title, Dictionary<string, string> department, string location, string type, Dictionary<string, string> description, Dictionary<string, List<string>> requirements, Dictionary<string, List<string>> coreObjectives)
    {
        var refCode = await GenerateUniqueReferenceCodeAsync();

        var entity = new JobRequisition
        {
            Title = title,
            ReferenceCode = refCode,
            Department = department,
            Location = location,
            Type = type,
            Description = description,
            Requirements = requirements,
            CoreObjectives = coreObjectives
        };

        await _jobRepo.AddAsync(entity);
        return Result<JobRequisition>.Ok(entity, "Job requisition created.");
    }

    public async Task<Result> UpdateJobAsync(Guid id, Dictionary<string, string> title, Dictionary<string, string> department, string location, string type, Dictionary<string, string> description, Dictionary<string, List<string>> requirements, Dictionary<string, List<string>> coreObjectives, bool isActive)
    {
        var entity = await _jobRepo.GetByIdAsync(id);
        if (entity == null) return Result.Failure("Job requisition not found.");

        entity.Title = title;
        entity.Department = department;
        entity.Location = location;
        entity.Type = type;
        entity.Description = description;
        entity.Requirements = requirements;
        entity.CoreObjectives = coreObjectives;
        entity.IsActive = isActive;

        await _jobRepo.UpdateAsync(entity);
        return Result.Ok("Job requisition updated.");
    }

    private async Task<string> GenerateUniqueReferenceCodeAsync()
    {
        string code;
        bool exists;
        do
        {
            code = $"REQ-{Guid.NewGuid().ToString("N")[..8].ToUpper()}-CE";
            var existing = await _jobRepo.GetAsync(j => j.ReferenceCode == code);
            exists = existing.Any();
        } while (exists);

        return code;
    }

    public async Task<Result<PagedResult<object>>> GetApplicationsAsync(int pageNumber, int pageSize)
    {
        var query = _dbContext.JobApplications
            .Include(a => a.JobRequisition)
            .OrderByDescending(a => a.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();

        var dtos = items.Select(a => new {
            a.Id,
            a.CandidateName,
            a.Email,
            a.ExecutiveSummary,
            a.JobRequisitionId,
            a.CreatedAt,
            a.Status,
            JobTitle = a.JobRequisition != null ? L(a.JobRequisition.Title, "en") : null,
            JobReferenceCode = a.JobRequisition?.ReferenceCode,
            a.CvBlobPath,
            a.LinkedInUrl
        }).Cast<object>().ToList();

        var pagedResult = new PagedResult<object>(dtos, totalCount, pageNumber, pageSize);
        return Result<PagedResult<object>>.Ok(pagedResult);
    }

    public async Task<Result<object>> GetApplicationByIdAsync(Guid id)
    {
        var application = await _dbContext.JobApplications
            .Include(a => a.JobRequisition)
            .Include(a => a.Logs)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (application == null)
            return Result<object>.Failure("Application not found.");

        // Pull reply history in the same call so the detail page doesn't
        // need a second round-trip to populate the "Sent replies" section.
        var rawReplies = await _dbContext.JobApplicationReplies
            .Where(r => r.JobApplicationId == id)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.Subject, r.Body, r.DeliveryOk, r.CreatedBy, r.CreatedAt })
            .ToListAsync();

        // Batch every user lookup for both logs and replies into one query.
        var logUserIds = application.Logs.Select(l => l.UserId);
        var replyUserIds = rawReplies
            .Where(r => !string.IsNullOrWhiteSpace(r.CreatedBy) && Guid.TryParse(r.CreatedBy, out _))
            .Select(r => Guid.Parse(r.CreatedBy!));
        var allUserIds = logUserIds.Concat(replyUserIds).Distinct().ToList();
        var users = await _dbContext.Users.Where(u => allUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u =>
            {
                var full = (u.FirstName + " " + u.LastName).Trim();
                return string.IsNullOrWhiteSpace(full) ? u.Email : full;
            });

        string? ResolveReplyUser(string? createdBy)
        {
            if (string.IsNullOrWhiteSpace(createdBy)) return null;
            if (createdBy == "System-Anonymous") return null;
            if (Guid.TryParse(createdBy, out var rid) && users.TryGetValue(rid, out var name)) return name;
            return createdBy;
        }

        var replies = rawReplies.Select(r => new {
            r.Id, r.Subject, r.Body, r.DeliveryOk,
            SentBy = ResolveReplyUser(r.CreatedBy),
            SentAt = r.CreatedAt,
        }).ToList();

        var dto = new {
            application.Id,
            application.CandidateName,
            application.Email,
            application.ExecutiveSummary,
            application.JobRequisitionId,
            application.CreatedAt,
            application.Status,
            JobTitle = application.JobRequisition != null ? L(application.JobRequisition.Title, "en") : null,
            JobReferenceCode = application.JobRequisition?.ReferenceCode,
            application.CvBlobPath,
            application.LinkedInUrl,
            Logs = application.Logs.OrderByDescending(l => l.LogDate).Select(l => new {
                l.Id,
                l.FromStatus,
                l.ToStatus,
                l.Notes,
                l.LogDate,
                UserName = users.ContainsKey(l.UserId) ? users[l.UserId] : "System"
            }).ToList(),
            Replies = replies,
        };

        return Result<object>.Ok(dto);
    }

    public async Task<Result> UpdateApplicationStatusAsync(Guid id, ApplicationStatus newStatus, Guid userId, string? notes = null)
    {
        var application = await _dbContext.JobApplications.FirstOrDefaultAsync(a => a.Id == id);
        if (application == null)
            return Result.Failure("Application not found.");

        if (application.Status != newStatus)
        {
            var previous = application.Status;
            var log = new JobApplicationLog
            {
                JobApplicationId = application.Id,
                FromStatus = previous,
                ToStatus = newStatus,
                UserId = userId,
                Notes = notes
            };

            application.Status = newStatus;

            _dbContext.JobApplicationLogs.Add(log);
            await _dbContext.SaveChangesAsync();

            // Let every applications.* admin know about the transition.
            await _notifications.CreateAsync(
                permissionArea: "applications",
                type: "application_status_changed",
                title: "Application status updated",
                message: $"{application.CandidateName}: {previous} → {newStatus}",
                link: $"/applications/{application.Id}",
                entityId: application.Id);
        }

        return Result.Ok("Application status updated.");
    }
}
