using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;

using Oztemur.API.Domain.Enums;

namespace Oztemur.API.Features.Careers.Services;

public interface ICareersService
{
    Task<Result<PagedResult<object>>> GetActiveJobsAsync(int pageNumber, int pageSize, string lang = "tr");
    Task<Result<object>> GetJobByIdAsync(Guid id, string lang = "tr");
    Task<Result> SubmitApplicationAsync(JobApplicationDto request);

    // Admin Operations
    Task<Result<JobRequisition>> CreateJobAsync(Dictionary<string, string> title, Dictionary<string, string> department, string location, string type, Dictionary<string, string> description, Dictionary<string, List<string>> requirements, Dictionary<string, List<string>> coreObjectives);
    Task<Result> UpdateJobAsync(Guid id, Dictionary<string, string> title, Dictionary<string, string> department, string location, string type, Dictionary<string, string> description, Dictionary<string, List<string>> requirements, Dictionary<string, List<string>> coreObjectives, bool isActive);
    Task<Result<PagedResult<object>>> GetApplicationsAsync(int pageNumber, int pageSize);
    Task<Result<object>> GetApplicationByIdAsync(Guid id);
    Task<Result> UpdateApplicationStatusAsync(Guid id, ApplicationStatus newStatus, Guid userId, string? notes = null);
}
