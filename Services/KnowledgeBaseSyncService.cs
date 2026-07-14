using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GuildedThorn.com.Services;

// Polls the knowledge-base vault on a timer so the site stays in sync with
// GitHub without a webhook. KnowledgeBaseSyncEngine itself no-ops instantly
// when the remote hasn't moved, so a short interval is cheap.
public class KnowledgeBaseSyncService(
    KnowledgeBaseSyncEngine engine,
    IConfiguration config,
    ILogger<KnowledgeBaseSyncService> logger) : BackgroundService {

    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        var interval = TimeSpan.FromMinutes(config.GetValue<double?>("KnowledgeBase:PollIntervalMinutes") ?? 5);

        while (!stoppingToken.IsCancellationRequested) {
            try {
                await engine.SyncAsync(ct: stoppingToken);
            } catch (OperationCanceledException) {
                break;
            } catch (Exception ex) {
                logger.LogWarning(ex, "KnowledgeBase: sync failed, will retry next poll");
            }

            try {
                await Task.Delay(interval, stoppingToken);
            } catch (OperationCanceledException) {
                break;
            }
        }
    }
}
