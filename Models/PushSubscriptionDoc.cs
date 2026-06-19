using System;

namespace GuildedThorn.com.Models;

// A browser's Web Push subscription. Anyone (logged in or not) can subscribe to
// "going live" notifications; the endpoint URL uniquely identifies the browser,
// so we key on it to avoid duplicates. Username is recorded when available, but
// is not required.
public class PushSubscriptionDoc {

    public string Id { get; set; } = Guid.NewGuid().ToString();

    // The push service endpoint the browser handed us — unique per subscription.
    public string Endpoint { get; set; } = string.Empty;

    // Keys from the browser's PushSubscription, needed to encrypt the payload.
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;

    // Optional — set when a logged-in user subscribed.
    public string? Username { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
