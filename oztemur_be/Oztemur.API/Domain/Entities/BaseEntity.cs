using System;

namespace Oztemur.API.Domain.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // Auditing (Timing)
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
    
    // Auditing (Identity)
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    
    // Soft Delete Compliance
    public bool IsDeleted { get; set; } = false;
    public DateTimeOffset? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
