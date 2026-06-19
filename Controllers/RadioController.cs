using System;
using System.Threading;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RadioController(RadioService radio, IHubContext<RadioHub> radioHub) : ControllerBase {

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
}
