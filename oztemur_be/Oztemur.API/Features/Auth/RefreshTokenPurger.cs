using Microsoft.EntityFrameworkCore;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Auth;

public sealed class RefreshTokenPurger : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenPurger> _logger;
    private readonly int _retentionDays;

    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(3);
    private static readonly TimeSpan BatchBreather = TimeSpan.FromSeconds(1);
    private const int BatchSize = 10_000;

    public RefreshTokenPurger(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<RefreshTokenPurger> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _retentionDays = configuration.GetValue<int?>("Auth:RefreshTokenRetentionDays") ?? 7;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_retentionDays <= 0)
        {
            _logger.LogWarning("RefreshToken purge disabled (Auth:RefreshTokenRetentionDays={Days}).", _retentionDays);
            return;
        }

        try { await Task.Delay(StartupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await PurgeAsync(stoppingToken); }
            catch (OperationCanceledException) { return; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RefreshToken purge failed.");
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
            int deleted = await db.RefreshTokens
                .Where(t =>
                    (t.ExpiresAt < cutoff)
                    || (t.UsedAt != null && t.UsedAt < cutoff)
                    || (t.RevokedAt != null && t.RevokedAt < cutoff))
                .OrderBy(t => t.ExpiresAt)
                .Take(BatchSize)
                .ExecuteDeleteAsync(ct);

            totalDeleted += deleted;
            if (deleted < BatchSize) break;

            try { await Task.Delay(BatchBreather, ct); }
            catch (OperationCanceledException) { return; }
        }

        if (totalDeleted > 0)
            _logger.LogInformation("RefreshToken purge removed {Count} row(s) past cutoff {Cutoff:O}.", totalDeleted, cutoff);
    }
}
