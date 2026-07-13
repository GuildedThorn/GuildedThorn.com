using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RadioController(
    RadioService radio,
    IHubContext<RadioHub> radioHub,
    MongoDbService mongo,
    S3StorageService storage,
    IConfiguration config) : ControllerBase {

    private string RecordingsBucket => config["Storage:S3BucketRadio"] ?? "radio-archive";

    // Replaces Icecast's status-json.xsl — the SPA polls this for on-air state
    // and "now playing".
    [AllowAnonymous]
    [HttpGet("status")]
    public IActionResult Status() => Ok(new {
        online = radio.IsLive,
        name = radio.StationName,
        title = radio.Title,
        artist = radio.Artist,
        listeners = radio.ListenerCount,
    });

    // The live audio the <audio> element plays. Stays subscribed until the
    // client disconnects or the source goes offline.
    [AllowAnonymous]
    [HttpGet("stream")]
    public async Task Stream(CancellationToken ct) {
        if (!radio.IsLive) {
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return;
        }

        Response.ContentType = radio.ContentType;
        Response.Headers["Cache-Control"] = "no-cache, no-store";
        Response.Headers["icy-name"] = radio.StationName;
        // Live stream: never buffer the whole (infinite) body.
        HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        var (id, header, reader) = radio.AddListener();
        // Push the new viewer count to everyone watching the page in real time.
        await BroadcastListenerCount();
        try {
            // Ogg codecs need the decoder-init pages before any live data.
            if (header.Length > 0) {
                await Response.Body.WriteAsync(header, ct);
                await Response.Body.FlushAsync(ct);
            }
            await foreach (var chunk in reader.ReadAllAsync(ct)) {
                await Response.Body.WriteAsync(chunk, ct);
                await Response.Body.FlushAsync(ct);
            }
        } catch (OperationCanceledException) {
            // client navigated away / stopped playback
        } finally {
            radio.RemoveListener(id);
            await BroadcastListenerCount();
        }
    }

    // SignalR best-effort: failing to announce a count should never break the
    // audio stream or the disconnect cleanup.
    private async Task BroadcastListenerCount() {
        try {
            await radioHub.Clients.All.SendAsync("ListenerCount", radio.ListenerCount);
        } catch {
            // ignore — count is cosmetic
        }
    }

    // Past broadcasts — see RadioSourceListener for how these get recorded.
    [AllowAnonymous]
    [HttpGet("recordings")]
    public async Task<IActionResult> GetRecordings([FromQuery] int page = 1, [FromQuery] int pageSize = 10) {
        if (page < 1 || pageSize < 1) return BadRequest();

        var coll = mongo.GetRadioRecordingsCollection();
        var totalDocs = await coll.CountDocumentsAsync(_ => true);
        var totalPages = (int)Math.Ceiling(totalDocs / (double)pageSize);

        var items = await coll.Find(_ => true)
            .SortByDescending(r => r.StartedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        var result = items.Select(r => new {
            id = r.Id,
            stationName = r.StationName,
            startedAt = r.StartedAt,
            durationSeconds = r.DurationSeconds,
            sizeBytes = r.SizeBytes,
        });

        return Ok(new { items = result, totalPages });
    }

    // id is only ever used to look up a Mongo doc — the actual object key
    // comes from that doc's (server-controlled) FileName, never from this
    // parameter directly. Redirects straight to SeaweedFS instead of
    // proxying the bytes through this app.
    [AllowAnonymous]
    [HttpGet("recordings/{id}/stream")]
    public async Task<IActionResult> StreamRecording(string id) {
        var recording = await mongo.GetRadioRecordingsCollection()
            .Find(r => r.Id == id)
            .FirstOrDefaultAsync();
        if (recording is null) return NotFound();

        var url = await storage.GetPresignedUrlAsync(RecordingsBucket, recording.FileName, TimeSpan.FromMinutes(30));
        return Redirect(url);
    }
}
