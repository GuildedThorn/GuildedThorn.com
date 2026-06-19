using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StreamScheduleController(
    MongoDbService mongo,
    PushNotificationService push,
    IHubContext<RadioHub> radioHub) : ControllerBase {

    // Anyone can see the schedule.
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetSchedule() {
        var events = await mongo.GetStreamEventCollection()
            .Find(_ => true)
            .ToListAsync();

        // Sort chronologically by date+time (both zero-padded strings).
        var ordered = events
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Time)
            .Select(e => new { id = e.Id, date = e.Date, time = e.Time, title = e.Title });

        return Ok(ordered);
    }

    public record CreateEventRequest(string Date, string Time, string Title);

    // Only owners may add stream events.
    [Authorize(Roles = "owner")]
    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest req) {
        if (string.IsNullOrWhiteSpace(req.Date) ||
            string.IsNullOrWhiteSpace(req.Time) ||
            string.IsNullOrWhiteSpace(req.Title)) {
            return BadRequest("Date, time, and title are required.");
        }

        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
        var ev = new StreamEvent {
            Date = req.Date.Trim(),
            Time = req.Time.Trim(),
            Title = req.Title.Trim(),
            CreatedBy = username,
        };
        await mongo.GetStreamEventCollection().InsertOneAsync(ev);

        // Same notification alerts as going live: in-app toast + Web Push.
        var when = $"{ev.Date} at {ev.Time}";
        await radioHub.Clients.All.SendAsync("StreamScheduled", new { title = ev.Title, date = ev.Date, time = ev.Time });
        await push.SendToAllAsync(
            title: "New stream scheduled",
            body: $"{ev.Title} — {when}",
            url: "/radio");

        return Ok(new { id = ev.Id, date = ev.Date, time = ev.Time, title = ev.Title });
    }

    // Only owners may remove stream events.
    [Authorize(Roles = "owner")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEvent(string id) {
        var result = await mongo.GetStreamEventCollection().DeleteOneAsync(e => e.Id == id);
        return result.DeletedCount > 0 ? Ok() : NotFound();
    }
}
