using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class ContactController(MongoDbService mongoDbService) : ControllerBase {

    public class ContactRequest {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Message { get; set; }
    }

    [AllowAnonymous]
    [EnableRateLimiting("contact")]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] ContactRequest? req) {
        if (req is null) return BadRequest("Missing request body.");

        var name = req.Name?.Trim() ?? string.Empty;
        var email = req.Email?.Trim() ?? string.Empty;
        var message = req.Message?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(name) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(message))
            return BadRequest("Name, email, and message are all required.");

        if (name.Length > 120 || email.Length > 200 || message.Length > 5000)
            return BadRequest("One or more fields are too long.");

        if (!new EmailAddressAttribute().IsValid(email))
            return BadRequest("Please provide a valid email address.");

        var doc = new ContactMessage {
            Name = name,
            Email = email,
            Message = message
        };
        await mongoDbService.GetContactMessageCollection().InsertOneAsync(doc);

        return Ok(new { ok = true });
    }

    [Authorize(Roles = "owner")]
    [HttpGet]
    public async Task<IActionResult> GetMessages(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (page < 1 || pageSize < 1) return BadRequest();

        var coll = mongoDbService.GetContactMessageCollection();
        var total = await coll.CountDocumentsAsync(_ => true);
        var totalPages = (int)System.Math.Ceiling(total / (double)pageSize);
        var unread = await coll.CountDocumentsAsync(m => !m.IsRead);

        var items = await coll.Find(_ => true)
            .SortByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return Ok(new { items, totalPages, unread, total });
    }

    [Authorize(Roles = "owner")]
    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(string id, [FromQuery] bool read = true) {
        var result = await mongoDbService.GetContactMessageCollection()
            .UpdateOneAsync(
                m => m.Id == id,
                Builders<ContactMessage>.Update.Set(m => m.IsRead, read));

        if (result.MatchedCount == 0) return NotFound();
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "owner")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id) {
        var result = await mongoDbService.GetContactMessageCollection()
            .DeleteOneAsync(m => m.Id == id);

        if (result.DeletedCount == 0) return NotFound();
        return Ok(new { ok = true });
    }
}
