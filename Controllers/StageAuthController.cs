#nullable enable

using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/stage-auth")]
[EnableRateLimiting("stage")]
public sealed class StageAuthController(
    StageDeviceCodeService devices,
    JwtTokenService tokens,
    MongoDbService mongo,
    ILogger<StageAuthController> logger) : ControllerBase {

    public sealed record ApproveRequest(string UserCode);
    public sealed record PollRequest(string DeviceCode);
    public sealed record VerifyRequest(string Token);
    public sealed record ReportRequest(string Token, string ReportedName, long PeerId, string Reason, string? Room);

    [AllowAnonymous]
    [HttpPost("device/start")]
    public IActionResult StartDeviceFlow() {
        var started = devices.Start();
        string origin = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
        string verificationUri = $"{origin}/stage/connect?code={Uri.EscapeDataString(started.UserCode)}";
        return Ok(new {
            deviceCode = started.DeviceCode,
            userCode = started.UserCode,
            verificationUri,
            expiresAt = started.ExpiresAt,
            pollIntervalSeconds = 2,
        });
    }

    [Authorize]
    [HttpPost("device/approve")]
    public async Task<IActionResult> Approve([FromBody] ApproveRequest request) {
        string? username = User.FindFirst(JwtRegisteredClaimNames.Name)?.Value
            ?? User.FindFirst("name")?.Value
            ?? User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized();
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
        if (user is null)
            return Unauthorized();
        if (!devices.Approve(request.UserCode, user))
            return NotFound(new { message = "That code is invalid or has expired." });
        logger.LogInformation("SurroundStage browser link approved for {User}", username);
        return Ok(new { approved = true, username });
    }

    [AllowAnonymous]
    [HttpPost("device/poll")]
    public IActionResult Poll([FromBody] PollRequest request) {
        var result = devices.Poll(request.DeviceCode);
        return result.Status switch {
            "approved" => Ok(new {
                status = result.Status,
                token = result.Token,
                username = result.Username,
                expiresAt = result.ExpiresAt,
            }),
            "pending" => Accepted(new { status = result.Status, expiresAt = result.ExpiresAt }),
            _ => StatusCode(410, new { status = "expired" }),
        };
    }

    [AllowAnonymous]
    [HttpPost("verify")]
    public IActionResult Verify([FromBody] VerifyRequest request) {
        ClaimsPrincipal? principal = tokens.ValidateStageToken(request.Token);
        if (principal is null || principal.FindFirst("scope")?.Value != "surroundstage")
            return Unauthorized(new { valid = false });
        string name = principal.FindFirst(JwtRegisteredClaimNames.Name)?.Value
            ?? principal.FindFirst("name")?.Value
            ?? "";
        string role = principal.FindFirst(ClaimTypes.Role)?.Value ?? "user";
        return Ok(new { valid = true, name, role });
    }

    [AllowAnonymous]
    [HttpPost("report")]
    public IActionResult Report([FromBody] ReportRequest request) {
        ClaimsPrincipal? principal = tokens.ValidateStageToken(request.Token);
        if (principal is null || principal.FindFirst("scope")?.Value != "surroundstage")
            return Unauthorized();
        string reporter = principal.FindFirst(JwtRegisteredClaimNames.Name)?.Value
            ?? principal.FindFirst("name")?.Value
            ?? "unknown";
        string reason = (request.Reason ?? "").Replace('\n', ' ').Replace('\r', ' ').Trim();
        if (reason.Length > 300) reason = reason[..300];
        logger.LogWarning(
            "SurroundStage report: reporter={Reporter} peer={PeerId} name={ReportedName} room={Room} reason={Reason}",
            reporter, request.PeerId, request.ReportedName, request.Room ?? "unknown", reason);
        return Accepted(new { received = true });
    }
}
