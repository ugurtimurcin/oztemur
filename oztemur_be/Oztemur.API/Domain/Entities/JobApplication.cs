using System;
using Oztemur.API.Domain.Enums;

namespace Oztemur.API.Domain.Entities;

public class JobApplication : BaseEntity
{
    public Guid JobRequisitionId { get; set; }
    public JobRequisition? JobRequisition { get; set; }
    
    public string CandidateName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string LinkedInUrl { get; set; } = string.Empty;
    
    public string ExecutiveSummary { get; set; } = string.Empty;
    
    // Path where the uploaded CV PDF is structurally persisted (e.g. AWS S3 key or Azure Blob)
    public string CvBlobPath { get; set; } = string.Empty;

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    
    public ICollection<JobApplicationLog> Logs { get; set; } = new List<JobApplicationLog>();
}
