using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class GuestBookController(
    MongoDbService mongoDbService,
    RabbitMqService rabbitMqService,
    ChatModerationService mod,
    PushNotificationService push,
    ILogger<GuestBookController> logger) : ControllerBase {

    [Authorize(Policy = "PrivilegedOnly")]
    [HttpPost("message")]      // keep the route short & REST‑y
    public async Task<IActionResult> CreateGuestBookMessage(
        [FromBody] string message)        // only need the message now
    {
        if (string.IsNullOrWhiteSpace(message))
            return BadRequest("Message cannot be empty.");

        // ──────────────────────────────────
        // 1. Get username from the JWT
        // ──────────────────────────────────
        var username =
            User.FindFirst(ClaimTypes.Name)?.Value               // standard “name”
            ?? User.FindFirst("preferred_username")?.Value       // OpenID style
            ?? User.Identity?.Name;                              // fallback

        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized("Username claim missing.");

        if (mod.IsBanned(username))
            return StatusCode(403, "You are banned from posting.");

        // ──────────────────────────────────
        // 2. Enforce one‑message‑per‑user
        // ──────────────────────────────────
        var coll = mongoDbService.GetGuestBookCollection();
        var exists = await coll.Find(g => g.Username == username).AnyAsync();
        if (exists) return Conflict("You’ve already left a guest‑book message.");

        // ──────────────────────────────────
        // 3. Insert
        // ──────────────────────────────────
        var doc = new Models.GuestBookMessages { Username = username, Message = message };
        await coll.InsertOneAsync(doc);

        await rabbitMqService.PublishGuestbookMessageAsync(username, message);

        // Push failures must never break the guestbook post (same fire-and-log
        // pattern as RadioSourceListener.NotifyWentLiveAsync).
        try {
            var preview = message.Length > 120 ? message[..117] + "..." : message;
            await push.SendToAllAsync(
                title: "New guestbook message",
                body: $"{username}: {preview}",
                url: "/guestbook");
        } catch (Exception ex) {
            logger.LogWarning(ex, "Failed to send guestbook push notification");
        }

        return Ok("Guest‑book message created successfully.");
    }
    
    [AllowAnonymous] // anyone may read
    [HttpGet("getGuestBookMessages")]
    public async Task<IActionResult> GetGuestBookMessages(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        if (page < 1 || pageSize < 1) return BadRequest();

        var coll       = mongoDbService.GetGuestBookCollection();
        var totalDocs  = await coll.CountDocumentsAsync(_ => true);
        var totalPages = (int)Math.Ceiling(totalDocs / (double)pageSize);

        var items = await coll.Find(_ => true)
            .SortByDescending(g => g.Id)          // newest first
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        // Look up each author's current avatar so messages can show it.
        var usernames = items.Select(i => i.Username).Distinct().ToList();
        var users = await mongoDbService.GetUserCollection()
            .Find(u => usernames.Contains(u.Username))
            .ToListAsync();
        var avatarByUser = users
            .GroupBy(u => u.Username)
            .ToDictionary(g => g.Key, g => g.First().AvatarUrl);

        var result = items.Select(i => new {
            _id = i.Id,
            username = i.Username,
            message = i.Message,
            createdAt = i.CreatedAt,
            avatarUrl = avatarByUser.TryGetValue(i.Username, out var url) ? url : null
        });

        return Ok(new { items = result, totalPages });
    }

    // ──────────────────────────────────
    // Owner moderation
    // ──────────────────────────────────
    [Authorize(Roles = "owner")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMessage(string id) {
        var result = await mongoDbService.GetGuestBookCollection()
            .DeleteOneAsync(g => g.Id == id);

        if (result.DeletedCount == 0) return NotFound();
        return Ok(new { ok = true });
    }

    public class BanRequest {
        public string? Username { get; set; }
    }

    // Ban a user site-wide (chat + guestbook) and remove their guestbook post.
    [Authorize(Roles = "owner")]
    [HttpPost("ban")]
    public async Task<IActionResult> BanUser([FromBody] BanRequest? req) {
        var username = req?.Username?.Trim();
        if (string.IsNullOrWhiteSpace(username))
            return BadRequest("Username is required.");

        var bannedBy =
            User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.Identity?.Name;

        await mod.BanAsync(username, bannedBy);
        await mongoDbService.GetGuestBookCollection()
            .DeleteManyAsync(g => g.Username == username);

        return Ok(new { ok = true });
    }
}