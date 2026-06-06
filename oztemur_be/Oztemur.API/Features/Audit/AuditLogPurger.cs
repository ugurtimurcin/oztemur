using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Audit;

/// <summary>
/// Trims the <c>AuditLogs</c> table to a configurable retention window
/// (default 35 days, overridable via the <c>Audit:RetentionDays</c>
/// configuration key or the <c>Audit__RetentionDays</c> environment
/// variable). Runs once on startup (after a brief stagger) and then once
/// every 24 hours for the lifetime of the host.
///
/// Deletes happen in fixed-size batches so a large backlog can't lock the
/// audit table for minutes on end. The index on <c>Timestamp</c> makes
/// each batch cheap.
///
/// Set <c>Audit:RetentionDays</c> to <c>0</c> (or any non-positive value)
/// to disable the purge — useful in environments that need indefinite
/// audit retention.
/// </summary>
public sealed class AuditLogPurger : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogPurger> _logger;
    private readonly int _retentionDays;

    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan BatchBreather = TimeSpan.FromSeconds(1);
    private const int BatchSize = 10_000;

    public AuditLogPurger(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<AuditLogPurger> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _retentionDays = configuration.GetValue<int?>("Audit:RetentionDays") ?? 35;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_retentionDays <= 0)
        {
            _logger.LogWarning("AuditLog purge disabled (Audit:RetentionDays={Days}).", _retentionDays);
            return;
        }

        // Wait briefly on boot so the first run doesn't race migrations or
        // the seed pipeline. After that, fire once per 24h.
        try { await Task.Delay(StartupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await PurgeAsync(stoppingToken); }
            catch (OperationCanceledException) { return; }
            catch (Exception ex)
            {
                // Logged so it surfaces in the Error-only Serilog sink; we
                // intentionally swallow so the loop keeps running tomorrow.
                _logger.LogError(ex, "AuditLog purge failed.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task PurgeAsync(CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-_retentionDays);

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<OztemurDbContext>();

        int totalDeleted = 0;
        while (!ct.IsCancellationRequested)
        {
            // EF Core 7+ bulk delete — produces a single DELETE statement
            // server-side (no entity materialisation), and Take(N) becomes
            // a LIMIT N subquery so the batch stays small.
            int deleted = await db.AuditLogs
                .Where(a => a.Timestamp < cutoff)
                .OrderBy(a => a.Timestamp)
                .Take(BatchSize)
                .ExecuteDeleteAsync(ct);

            totalDeleted += deleted;
            if (deleted < BatchSize) break;

            // Give other transactions room between batches when there's a
            // huge backlog (e.g. first run after enabling retention).
            try { await Task.Delay(BatchBreather, ct); }
            catch (OperationCanceledException) { return; }
        }

        // Only surfaces in the log when something interesting happened —
        // the Error-only sink swallows Information, so this is mostly for
        // local debugging and any future log level changes.
        if (totalDeleted > 0)
            _logger.LogInformation("AuditLog purge removed {Count} row(s) older than {Cutoff:O}.", totalDeleted, cutoff);
    }
}
