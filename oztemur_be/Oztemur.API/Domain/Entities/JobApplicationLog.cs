using System;
using Oztemur.API.Domain.Enums;

namespace Oztemur.API.Domain.Entities;

public class JobApplicationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid JobApplicationId { get; set; }
    public JobApplication? JobApplication { get; set; }
    
    public ApplicationStatus? FromStatus { get; set; }
    public ApplicationStatus ToStatus { get; set; }
    
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    
    public string? Notes { get; set; }
    
    public DateTime LogDate { get; set; } = DateTime.UtcNow;
}
