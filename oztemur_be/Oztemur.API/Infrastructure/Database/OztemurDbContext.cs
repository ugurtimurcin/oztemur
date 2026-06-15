using Microsoft.EntityFrameworkCore;
using Oztemur.API.Domain.Entities;

namespace Oztemur.API.Infrastructure.Database;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

public class OztemurDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public OztemurDbContext(DbContextOptions<OztemurDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Property names whose values must be redacted before they ever land in
    /// the AuditLog JSON. Add new credential/secret columns here when they
    /// appear — the check is case-insensitive substring so common naming
    /// conventions (PasswordHash, SmtpPasswordEncrypted, TokenHash) are all
    /// caught without listing each one.
    /// </summary>
    private static bool IsSensitiveField(string propertyName)
    {
        if (string.IsNullOrEmpty(propertyName)) return false;
        // "Permissions" contains the role catalogue — not a secret, keep it.
        return propertyName.Contains("Password", StringComparison.OrdinalIgnoreCase)
            || propertyName.Contains("Secret",   StringComparison.OrdinalIgnoreCase)
            || propertyName.Contains("TokenHash", StringComparison.OrdinalIgnoreCase)
            || propertyName.EndsWith("Encrypted", StringComparison.OrdinalIgnoreCase);
    }

    private string GetCurrentUserId()
    {
        var user = _httpContextAccessor?.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated == true)
        {
            return user.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? user.FindFirst(ClaimTypes.Email)?.Value 
                ?? "Authenticated-Unknown";
        }
        return "System-Anonymous";
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = GetCurrentUserId();
        var auditEntries = new List<AuditLog>();

        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is BaseEntity
                && e.Entity is not AuditLog
                && e.Entity is not Notification
                && e.Entity is not RefreshToken
                && e.Entity is not PasswordResetToken
                && e.Entity is not TranslationSourceHash
                && e.State != EntityState.Detached
                && e.State != EntityState.Unchanged)
            .ToList();

        foreach (var entry in entries)
        {
            // Stamp the entity's own BaseEntity audit columns so consumers
            // (reply history, content lists, etc.) can show "who created
            // this" without hitting the AuditLog table. Without this, every
            // CreatedBy on every entity is null and the UI falls back to
            // "System" for everything.
            if (entry.Entity is BaseEntity be)
            {
                if (entry.State == EntityState.Added && string.IsNullOrEmpty(be.CreatedBy))
                    be.CreatedBy = currentUserId;
                if (entry.State == EntityState.Modified)
                {
                    be.UpdatedBy = currentUserId;
                    be.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }

            var auditEntry = new AuditLog
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name,
                UserId = currentUserId,
                Timestamp = DateTimeOffset.UtcNow
            };

            var originalValues = new Dictionary<string, object?>();
            var currentValues = new Dictionary<string, object?>();

            foreach (var property in entry.Properties)
            {
                var propertyName = property.Metadata.Name;

                // Secrets and credential material must never land in the audit
                // log — a DB dump or a curious admin viewing the audit page
                // shouldn't expose hashed passwords, encrypted SMTP creds, or
                // reset token hashes. Field NAMES still appear so admins can
                // see "password was changed", but values are replaced.
                object? RedactIfSensitive(object? value) =>
                    IsSensitiveField(propertyName) && value is not null ? "***REDACTED***" : value;

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.Action = "INSERT";
                        currentValues[propertyName] = RedactIfSensitive(property.CurrentValue);
                        break;

                    case EntityState.Deleted:
                        auditEntry.Action = "DELETE";
                        originalValues[propertyName] = RedactIfSensitive(property.OriginalValue);
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            // If this is specifically a Soft Delete modification
                            if (propertyName == "IsDeleted" && property.CurrentValue is true)
                            {
                                auditEntry.Action = "SOFT-DELETE";
                            }
                            else if (string.IsNullOrEmpty(auditEntry.Action))
                            {
                                auditEntry.Action = "UPDATE";
                            }

                            originalValues[propertyName] = RedactIfSensitive(property.OriginalValue);
                            currentValues[propertyName] = RedactIfSensitive(property.CurrentValue);
                        }
                        break;
                }
            }

            auditEntry.OldValues = originalValues.Count > 0 ? JsonSerializer.Serialize(originalValues) : null;
            auditEntry.NewValues = currentValues.Count > 0 ? JsonSerializer.Serialize(currentValues) : null;
            
            auditEntries.Add(auditEntry);
        }

        if (auditEntries.Any())
        {
            await AuditLogs.AddRangeAsync(auditEntries, cancellationToken);
        }

        // Execute actual database commit wrapper
        return await base.SaveChangesAsync(cancellationToken);
    }

    public DbSet<ApplicationUser> Users { get; set; } = null!;
    public DbSet<Company> Companies { get; set; } = null!;
    public DbSet<NewsArticle> NewsArticles { get; set; } = null!;
    public DbSet<BlogPost> BlogPosts { get; set; } = null!;
    public DbSet<JobRequisition> JobRequisitions { get; set; } = null!;
    public DbSet<JobApplication> JobApplications { get; set; } = null!;
    public DbSet<JobApplicationLog> JobApplicationLogs { get; set; } = null!;
    public DbSet<ContactMessage> ContactMessages { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<Language> Languages { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<PageSection> PageSections { get; set; } = null!;
    public DbSet<UiString> UiStrings { get; set; } = null!;
    public DbSet<LeadershipMember> LeadershipMembers { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<EmailProfile> EmailProfiles { get; set; } = null!;
    public DbSet<EmailRouting> EmailRoutings { get; set; } = null!;
    public DbSet<MessageReply> MessageReplies { get; set; } = null!;
    public DbSet<JobApplicationReply> JobApplicationReplies { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<TranslationSourceHash> TranslationSourceHashes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply Global Query Filters for Soft Deletes (meaning 'Deleted' records never show up in queries natively)
        modelBuilder.Entity<ApplicationUser>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Company>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<NewsArticle>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<BlogPost>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<JobRequisition>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<JobApplication>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<ContactMessage>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Language>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Project>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<PageSection>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<UiString>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<LeadershipMember>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Notification>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<EmailProfile>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<EmailRouting>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<MessageReply>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<MessageReply>().HasIndex(e => e.ContactMessageId);
        modelBuilder.Entity<JobApplicationReply>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<JobApplicationReply>().HasIndex(e => e.JobApplicationId);
        modelBuilder.Entity<PasswordResetToken>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<PasswordResetToken>().HasIndex(e => e.TokenHash);
        modelBuilder.Entity<PasswordResetToken>().HasIndex(e => new { e.UserId, e.UsedAt });

        // Slug uniqueness is enforced in the application layer (admin sees a
        // Turkish error message instead of a 500), but a unique DB index is
        // the second line of defence: it closes the concurrent-write race
        // where two admins POST the same slug at the same instant.
        modelBuilder.Entity<LeadershipMember>().HasIndex(e => e.Slug).IsUnique();
        modelBuilder.Entity<Project>().HasIndex(e => e.Slug).IsUnique();

        // AuditLog grows linearly with every change in the system. The audit
        // page filters by table and orders by timestamp DESC — a composite
        // (TableName, Timestamp) index makes both fast even at millions of
        // rows. Standalone Timestamp index covers "show me today's activity"
        // queries that don't filter by table.
        modelBuilder.Entity<AuditLog>().HasIndex(e => new { e.TableName, e.Timestamp });
        modelBuilder.Entity<AuditLog>().HasIndex(e => e.Timestamp);

        modelBuilder.Entity<RefreshToken>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<RefreshToken>().HasIndex(e => e.TokenHash);
        modelBuilder.Entity<RefreshToken>().HasIndex(e => new { e.UserId, e.UsedAt, e.RevokedAt });

        // TranslationSourceHash — one row per (entity, field, target lang).
        // The unique index also acts as the natural-key lookup the export and
        // import paths use to fetch a single row, so no extra index is needed.
        modelBuilder.Entity<TranslationSourceHash>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<TranslationSourceHash>()
            .HasIndex(e => new { e.EntityType, e.EntityId, e.FieldPath, e.TargetLanguage })
            .IsUnique()
            .HasDatabaseName("IX_TranslationSourceHashes_Natural");
        modelBuilder.Entity<Notification>().HasIndex(e => e.IsRead);
        modelBuilder.Entity<Language>().HasIndex(e => e.Code).IsUnique();
        modelBuilder.Entity<PageSection>().HasIndex(e => new { e.PageKey, e.SectionKey }).IsUnique();
        modelBuilder.Entity<UiString>().HasIndex(e => e.Key).IsUnique();
        modelBuilder.Entity<UiString>().HasIndex(e => e.Group);

        // We do NOT apply soft-delete filtering to AuditLog, because AuditLogs are immutable forensic records.

        // EF Core specific structural configs
        modelBuilder.Entity<JobApplication>()
            .HasOne(a => a.JobRequisition)
            .WithMany(r => r.Applications)
            .HasForeignKey(a => a.JobRequisitionId)
            .OnDelete(DeleteBehavior.Restrict); // Prevent cascading physical deletes if an HR Job listing is Soft-Deleted
            
        modelBuilder.Entity<JobApplicationLog>()
            .HasOne(l => l.JobApplication)
            .WithMany(a => a.Logs)
            .HasForeignKey(l => l.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // ─── JSONB i18n Column Mappings ──────────────────────
        // NewsArticle
        modelBuilder.Entity<NewsArticle>().Property(e => e.Title).HasColumnType("jsonb");
        modelBuilder.Entity<NewsArticle>().Property(e => e.Summary).HasColumnType("jsonb");
        modelBuilder.Entity<NewsArticle>().Property(e => e.Content).HasColumnType("jsonb");

        // BlogPost
        modelBuilder.Entity<BlogPost>().Property(e => e.Title).HasColumnType("jsonb");
        modelBuilder.Entity<BlogPost>().Property(e => e.Summary).HasColumnType("jsonb");
        modelBuilder.Entity<BlogPost>().Property(e => e.Content).HasColumnType("jsonb");

        // Company
        modelBuilder.Entity<Company>().Property(e => e.Name).HasColumnType("jsonb");
        modelBuilder.Entity<Company>().Property(e => e.Sector).HasColumnType("jsonb");
        modelBuilder.Entity<Company>().Property(e => e.Description).HasColumnType("jsonb");
        modelBuilder.Entity<Company>().Property(e => e.DetailedDescription).HasColumnType("jsonb");
        modelBuilder.Entity<Company>().Property(e => e.Address).HasColumnType("jsonb");

        // JobRequisition
        modelBuilder.Entity<JobRequisition>().Property(e => e.Title).HasColumnType("jsonb");
        modelBuilder.Entity<JobRequisition>().Property(e => e.Department).HasColumnType("jsonb");
        modelBuilder.Entity<JobRequisition>().Property(e => e.Description).HasColumnType("jsonb");
        modelBuilder.Entity<JobRequisition>().Property(e => e.Requirements).HasColumnType("jsonb");
        modelBuilder.Entity<JobRequisition>().Property(e => e.CoreObjectives).HasColumnType("jsonb");

        // Project
        modelBuilder.Entity<Project>().Property(e => e.Title).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.Category).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.Description).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.LongDescription).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.Location).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.Budget).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.Timeline).HasColumnType("jsonb");
        modelBuilder.Entity<Project>().Property(e => e.GalleryUrls).HasColumnType("jsonb");

        // PageSection
        modelBuilder.Entity<PageSection>().Property(e => e.Fields).HasColumnType("jsonb");

        // UiString
        modelBuilder.Entity<UiString>().Property(e => e.Values).HasColumnType("jsonb");

        // LeadershipMember
        modelBuilder.Entity<LeadershipMember>().Property(e => e.Name).HasColumnType("jsonb");
        modelBuilder.Entity<LeadershipMember>().Property(e => e.Role).HasColumnType("jsonb");
        modelBuilder.Entity<LeadershipMember>().Property(e => e.Bio).HasColumnType("jsonb");
    }
}
