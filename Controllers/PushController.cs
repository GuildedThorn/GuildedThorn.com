using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PushController(PushNotificationService push) : ControllerBase {

    // Browser fetches this to build a PushManager subscription.
    [AllowAnonymous]
    [HttpGet("vapidPublicKey")]
    public IActionResult VapidPublicKey() => Ok(new { publicKey = push.PublicKey });

    public record SubscribeRequest(string Endpoint, string P256dh, string Auth);

    // Anyone may subscribe — login not required. If the request is authenticated
    // we record the username too, but it's optional.
    [AllowAnonymous]
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest req) {
        if (string.IsNullOrWhiteSpace(req.Endpoint) ||
            string.IsNullOrWhiteSpace(req.P256dh) ||
            string.IsNullOrWhiteSpace(req.Auth)) {
            return BadRequest("Missing subscription fields.");
        }

        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
        await push.SaveSubscriptionAsync(req.Endpoint, req.P256dh, req.Auth, username);
        return Ok();
    }

    public record UnsubscribeRequest(string Endpoint);

    [AllowAnonymous]
    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest req) {
        await push.RemoveSubscriptionAsync(req.Endpoint);
        return Ok();
    }
}
