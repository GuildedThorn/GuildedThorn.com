using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using WebPush;

namespace GuildedThorn.com.Services;

// Sends Web Push notifications (VAPID) to every stored browser subscription.
// Used to tell people "GuildedThorn Radio is live" even when the site is closed.
public class PushNotificationService {

    private readonly MongoDbService _mongo;
    private readonly ILogger<PushNotificationService> _logger;
    private readonly WebPushClient _client = new();
    private readonly VapidDetails? _vapid;
    private readonly string _publicKey;

    public PushNotificationService(
        MongoDbService mongo,
        IConfiguration config,
        ILogger<PushNotificationService> logger) {
        _mongo = mongo;
        _logger = logger;

        _publicKey = config["WebPush:PublicKey"] ?? "";
        var privateKey = config["WebPush:PrivateKey"] ?? "";
        var subject = config["WebPush:Subject"] ?? "mailto:admin@guildedthorn.com";

        if (string.IsNullOrWhiteSpace(_publicKey) || string.IsNullOrWhiteSpace(privateKey)) {
            _logger.LogWarning("WebPush keys not configured — push notifications disabled.");
        } else {
            _vapid = new VapidDetails(subject, _publicKey, privateKey);
        }
    }

    // The public VAPID key the browser needs to create a subscription.
    public string PublicKey => _publicKey;
    public bool Enabled => _vapid is not null;

    public async Task SaveSubscriptionAsync(string endpoint, string p256dh, string auth, string? username) {
        if (string.IsNullOrWhiteSpace(endpoint)) return;
        var coll = _mongo.GetPushSubscriptionCollection();
        // Upsert on endpoint so re-subscribing the same browser doesn't duplicate.
        var update = Builders<PushSubscriptionDoc>.Update
            .Set(s => s.Endpoint, endpoint)
            .Set(s => s.P256dh, p256dh)
            .Set(s => s.Auth, auth)
            .Set(s => s.Username, username)
            .SetOnInsert(s => s.Id, Guid.NewGuid().ToString())
            .SetOnInsert(s => s.CreatedAt, DateTime.UtcNow);
        await coll.UpdateOneAsync(
            s => s.Endpoint == endpoint,
            update,
            new UpdateOptions { IsUpsert = true });
    }

    public async Task RemoveSubscriptionAsync(string endpoint) {
        if (string.IsNullOrWhiteSpace(endpoint)) return;
        await _mongo.GetPushSubscriptionCollection().DeleteOneAsync(s => s.Endpoint == endpoint);
    }

    // Fan a notification out to every subscription. Dead subscriptions (the push
    // service returns 404/410) are pruned so the list doesn't rot.
    public async Task SendToAllAsync(string title, string body, string url) {
        if (_vapid is null) return;

        var coll = _mongo.GetPushSubscriptionCollection();
        var subs = await coll.Find(_ => true).ToListAsync();
        if (subs.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title, body, url });
        var dead = new List<string>();

        foreach (var s in subs) {
            try {
                var subscription = new WebPush.PushSubscription(s.Endpoint, s.P256dh, s.Auth);
                await _client.SendNotificationAsync(subscription, payload, _vapid);
            } catch (WebPushException ex) when (
                ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone) {
                dead.Add(s.Endpoint);
            } catch (Exception ex) {
                _logger.LogWarning(ex, "Push send failed for one subscription");
            }
        }

        if (dead.Count > 0) {
            await coll.DeleteManyAsync(s => dead.Contains(s.Endpoint));
            _logger.LogInformation("Pruned {Count} expired push subscriptions", dead.Count);
        }

        _logger.LogInformation("Sent push '{Title}' to {Count} subscriptions", title, subs.Count - dead.Count);
    }
}
