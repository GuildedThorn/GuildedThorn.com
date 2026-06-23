using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace GuildedThorn.com.Models;

// A completed donation, written only by the verified Stripe webhook (never by the
// browser success redirect). One document per Stripe Checkout Session.
public class Donation {

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    // Stripe Checkout Session id — the idempotency key so a re-delivered webhook
    // doesn't double-record the same donation.
    public string StripeSessionId { get; set; } = string.Empty;

    public long AmountCents { get; set; }

    public string Currency { get; set; } = "usd";

    // The free-text display name a guest typed (optional).
    public string? DonorName { get; set; }

    // The logged-in account this donation is credited to (null for guests).
    // Captured server-side from the JWT — this is what gets @-mentioned on-site.
    public string? UserName { get; set; }

    public string? Message { get; set; }

    public string Status { get; set; } = "completed";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
