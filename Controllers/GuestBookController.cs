using System;
using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class GuestBookController(MongoDbService mongoDbService) : ControllerBase {

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

        return Ok(new { items, totalPages });
    }
}