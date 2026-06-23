using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Stripe;
using Stripe.Checkout;

namespace GuildedThorn.com.Services;

// Stripe donations (hosted Checkout). The flow is webhook-driven: the browser
// success redirect is cosmetic — a donation is only ever recorded by the verified
// `checkout.session.completed` webhook (signature is the single source of truth).
//
// A single DonationSettings doc holds the owner-controlled kill switch
// (Published). While false the donate UI is hidden from the public; the owner
// always sees it and can flip Published live from the OwnerBar.
public class DonationService {

    private readonly MongoDbService _mongo;
    private readonly ILogger<DonationService> _logger;
    private readonly string _secretKey;
    private readonly string _webhookSecret;

    public string PublishableKey { get; }
    public string Currency { get; }
    public IReadOnlyList<long> Presets { get; }

    // Cached published flag (-1 unknown, 0 false, 1 true) guarded by a gate so the
    // first concurrent readers don't all hit Mongo.
    private volatile int _publishedCache = -1;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public DonationService(
        MongoDbService mongo,
        IConfiguration config,
        ILogger<DonationService> logger) {
        _mongo = mongo;
        _logger = logger;

        _secretKey = config["Stripe:SecretKey"] ?? "";
        _webhookSecret = config["Stripe:WebhookSecret"] ?? "";
        PublishableKey = config["Stripe:PublishableKey"] ?? "";
        Currency = (config["Stripe:Currency"] ?? "usd").ToLowerInvariant();
        Presets = config.GetSection("Stripe:Presets").Get<long[]>()
                  ?? new long[] { 300, 500, 1000, 2500 };

        if (string.IsNullOrWhiteSpace(_secretKey)) {
            _logger.LogWarning("Stripe secret key not configured — donations disabled.");
        } else {
            StripeConfiguration.ApiKey = _secretKey;
        }
    }

    // True only once both Stripe is wired up and the secret key is present.
    public bool Configured => !string.IsNullOrWhiteSpace(_secretKey);

    // ---- Kill switch ----

    public async Task<bool> IsPublishedAsync() {
        if (_publishedCache != -1) return _publishedCache == 1;

        await _gate.WaitAsync();
        try {
            if (_publishedCache == -1) {
                var doc = await _mongo.GetDonationSettingsCollection()
                    .Find(FilterDefinition<DonationSettings>.Empty)
                    .FirstOrDefaultAsync();
                _publishedCache = doc?.Published == true ? 1 : 0;
            }
        } finally {
            _gate.Release();
        }
        return _publishedCache == 1;
    }

    public async Task SetPublishedAsync(bool published) {
        var coll = _mongo.GetDonationSettingsCollection();
        var existing = await coll.Find(FilterDefinition<DonationSettings>.Empty).FirstOrDefaultAsync();
        if (existing is null) {
            await coll.InsertOneAsync(new DonationSettings { Published = published });
        } else {
            await coll.UpdateOneAsync(
                d => d.Id == existing.Id,
                Builders<DonationSettings>.Update.Set(d => d.Published, published));
        }
        _publishedCache = published ? 1 : 0;
    }

    // ---- Checkout ----

    // Creates a hosted Checkout Session and returns its URL. Donor name/message
    // ride in metadata so the webhook can persist them without trusting the client.
    public async Task<string> CreateCheckoutSessionAsync(
        long amountCents, string? donorName, string? message, string origin) {
        var metadata = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(donorName)) metadata["donorName"] = donorName.Trim();
        if (!string.IsNullOrWhiteSpace(message)) metadata["message"] = message.Trim();

        var options = new SessionCreateOptions {
            Mode = "payment",
            SuccessUrl = $"{origin}/donate?status=success",
            CancelUrl = $"{origin}/donate?status=cancel",
            LineItems = new List<SessionLineItemOptions> {
                new() {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions {
                        Currency = Currency,
                        UnitAmount = amountCents,
                        ProductData = new SessionLineItemPriceDataProductDataOptions {
                            Name = "Donation to GuildedThorn",
                        },
                    },
                },
            },
            Metadata = metadata,
        };

        var session = await new SessionService().CreateAsync(options);
        return session.Url;
    }

    // ---- Webhook ----

    // Verifies the Stripe signature and, on checkout.session.completed, records the
    // donation idempotently. Returns false if the signature can't be verified.
    public async Task<bool> HandleWebhookAsync(string payload, string signatureHeader) {
        if (string.IsNullOrWhiteSpace(_webhookSecret)) {
            _logger.LogWarning("Stripe webhook secret not configured — rejecting webhook.");
            return false;
        }

        Event stripeEvent;
        try {
            stripeEvent = EventUtility.ConstructEvent(payload, signatureHeader, _webhookSecret);
        } catch (StripeException ex) {
            _logger.LogWarning(ex, "Stripe webhook signature verification failed");
            return false;
        }

        if (stripeEvent.Type == "checkout.session.completed"
            && stripeEvent.Data.Object is Session session) {
            await RecordDonationAsync(session);
        }

        return true;
    }

    private async Task RecordDonationAsync(Session session) {
        var coll = _mongo.GetDonationCollection();

        // Idempotent: a re-delivered webhook for the same session is a no-op.
        var already = await coll.Find(d => d.StripeSessionId == session.Id).AnyAsync();
        if (already) return;

        session.Metadata ??= new Dictionary<string, string>();
        var donation = new Donation {
            StripeSessionId = session.Id,
            AmountCents = session.AmountTotal ?? 0,
            Currency = session.Currency ?? Currency,
            DonorName = session.Metadata.GetValueOrDefault("donorName"),
            Message = session.Metadata.GetValueOrDefault("message"),
            Status = "completed",
            CreatedAt = DateTime.UtcNow,
        };
        await coll.InsertOneAsync(donation);
        _logger.LogInformation(
            "Recorded donation {Amount} {Currency} (session {Session})",
            donation.AmountCents, donation.Currency, session.Id);
    }
}
