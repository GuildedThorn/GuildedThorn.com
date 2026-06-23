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

    public string? DonorName { get; set; }

    public string? Message { get; set; }

    public string Status { get; set; } = "completed";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
