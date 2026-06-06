using System;

namespace Oztemur.API.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TableName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // INSERT, UPDATE, DELETE
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    
    // Using string to support simple username/email or standard Guids from JWT tokens
    public string? UserId { get; set; }
    
    // Storing pre and post state as JSON for point-in-time recovery and compliance
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
}
