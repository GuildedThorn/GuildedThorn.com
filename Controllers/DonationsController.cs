using System.IO;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationsController(DonationService donations) : ControllerBase {

    // Min/max guard rails on the amount (in cents). Keeps obvious junk and Stripe's
    // own limits out before we ever create a session.
    private const long MinCents = 100;          // $1.00
    private const long MaxCents = 1_000_000;    // $10,000

    // Public config the donate page needs. `enabled` is true when donations are
    // published OR the caller is the owner, so the owner can preview/polish the
    // page while it stays hidden from everyone else.
    [AllowAnonymous]
    [HttpGet("config")]
    public async Task<IActionResult> Config() {
        var published = await donations.IsPublishedAsync();
        return Ok(new {
            // What the public sees, with the owner bypassing the kill switch.
            enabled = published || User.IsInRole("owner"),
            // The raw kill-switch state, for the owner's toggle in the OwnerBar.
            published,
            configured = donations.Configured,
            publishableKey = donations.PublishableKey,
            currency = donations.Currency,
            presets = donations.Presets,
        });
    }

    public record CheckoutRequest(long AmountCents, string? Name, string? Message);

    // Creates a hosted Stripe Checkout Session and hands back its URL for the
    // browser to redirect to. Gated by the kill switch (owners bypass it) and
    // rate-limited against abuse.
    [AllowAnonymous]
    [EnableRateLimiting("donate")]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest req) {
        if (!donations.Configured)
            return StatusCode(503, new { message = "Donations are not available right now." });

        var isOwner = User.IsInRole("owner");
        if (!await donations.IsPublishedAsync() && !isOwner)
            return Forbid();

        if (req.AmountCents < MinCents || req.AmountCents > MaxCents)
            return BadRequest(new { message = "Please choose an amount between $1 and $10,000." });

        var origin = $"{Request.Scheme}://{Request.Host}";
        var url = await donations.CreateCheckoutSessionAsync(req.AmountCents, req.Name, req.Message, origin);
        return Ok(new { url });
    }

    // Stripe → server webhook. Reads the RAW body (signature is computed over the
    // exact bytes) and lets the service verify + record. Never trusts the browser.
    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook() {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();

        var ok = await donations.HandleWebhookAsync(payload, signature);
        return ok ? Ok() : BadRequest();
    }

    public record PublishRequest(bool Published);

    // The kill switch. Owner-only — flips public visibility of the donate UI live.
    [Authorize(Roles = "owner")]
    [HttpPost("publish")]
    public async Task<IActionResult> Publish([FromBody] PublishRequest req) {
        await donations.SetPublishedAsync(req.Published);
        return Ok(new { published = req.Published });
    }
}
