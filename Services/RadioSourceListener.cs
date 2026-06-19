using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace GuildedThorn.com.Services;

// Minimal Icecast-source server. Mixxx ("Icecast 2", MP3) connects here and
// pushes audio; we relay it to RadioService. Bound to loopback only, so the
// broadcaster must be on the same machine, and authenticated against an
// owner-role user in MongoDB (same credentials/hashing as login).
public class RadioSourceListener(
    RadioService radio,
    MongoDbService mongo,
    IConfiguration config,
    PushNotificationService push,
    IHubContext<RadioHub> radioHub,
    ILogger<RadioSourceListener> logger) : BackgroundService {

    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        var port = config.GetValue<int?>("Radio:SourcePort") ?? 8000;
        // Loopback only — nothing exposed off the box.
        var listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        logger.LogInformation("Radio source listener started on 127.0.0.1:{Port}", port);

        try {
            while (!stoppingToken.IsCancellationRequested) {
                var client = await listener.AcceptTcpClientAsync(stoppingToken);
                _ = HandleConnectionAsync(client, stoppingToken);
            }
        } catch (OperationCanceledException) {
            // normal shutdown
        } finally {
            listener.Stop();
        }
    }

    private async Task HandleConnectionAsync(TcpClient client, CancellationToken ct) {
        using (client)
        await using (var stream = client.GetStream()) {
            try {
                var head = await ReadRequestHeadAsync(stream, ct);
                if (head is null) return;
                var (method, path, headers) = head.Value;

                if (method is "SOURCE" or "PUT") {
                    await HandleSourceAsync(stream, headers, ct);
                } else if (method == "GET" && path.StartsWith("/admin/metadata", StringComparison.OrdinalIgnoreCase)) {
                    await HandleMetadataAsync(stream, path, ct);
                } else {
                    await WriteAsync(stream, "HTTP/1.0 405 Method Not Allowed\r\n\r\n", ct);
                }
            } catch (Exception ex) {
                logger.LogDebug(ex, "Radio source connection error");
            }
        }
    }

    private async Task HandleSourceAsync(NetworkStream stream, Dictionary<string, string> headers, CancellationToken ct) {
        if (!TryGetBasicAuth(headers, out var user, out var pass) || !await IsOwnerAsync(user, pass)) {
            await WriteAsync(stream, "HTTP/1.0 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"radio\"\r\n\r\n", ct);
            logger.LogWarning("Radio source rejected — auth failed for user '{User}'", user);
            return;
        }

        var contentType = headers.GetValueOrDefault("content-type", "audio/mpeg");
        var name = headers.GetValueOrDefault("ice-name", null!);

        if (!radio.TryStartSource(contentType, name)) {
            await WriteAsync(stream, "HTTP/1.0 403 Forbidden\r\n\r\nSource already connected", ct);
            logger.LogWarning("Radio source rejected — already broadcasting");
            return;
        }

        // libshout waits for a 200 before it starts sending audio.
        await WriteAsync(stream, "HTTP/1.0 200 OK\r\nServer: GuildedThornRadio\r\nConnection: close\r\n\r\n", ct);
        logger.LogInformation("Radio source connected as '{User}' ({ContentType})", user, contentType);

        // We just went live — tell everyone. Fire-and-forget so notification
        // delivery never blocks the audio relay below.
        _ = NotifyWentLiveAsync();

        try {
            var buffer = new byte[16 * 1024];
            int read;
            while ((read = await stream.ReadAsync(buffer, ct)) > 0) {
                // buffer[..read] copies into a fresh array the listeners can keep.
                radio.Publish(buffer[..read]);
            }
        } finally {
            radio.StopSource();
            logger.LogInformation("Radio source disconnected");
        }
    }

    // Notify on-site visitors (SignalR toast) and off-site subscribers (Web Push)
    // that the station just went live.
    private async Task NotifyWentLiveAsync() {
        var station = radio.StationName;
        try {
            await radioHub.Clients.All.SendAsync("RadioLive", new { name = station });
        } catch (Exception ex) {
            logger.LogWarning(ex, "Failed to broadcast RadioLive over SignalR");
        }
        try {
            await push.SendToAllAsync(
                title: $"{station} is live",
                body: "Tune in now — the broadcast just started.",
                url: "/radio");
        } catch (Exception ex) {
            logger.LogWarning(ex, "Failed to send go-live push notifications");
        }
    }

    private async Task HandleMetadataAsync(NetworkStream stream, string path, CancellationToken ct) {
        // Mixxx pushes "now playing" over a separate GET /admin/metadata?song=...
        var qIdx = path.IndexOf('?');
        var query = qIdx >= 0 ? path[(qIdx + 1)..] : "";
        var song = ParseQuery(query, "song");
        logger.LogInformation("Radio /admin/metadata hit: song='{Song}'", song is null ? "(none)" : Uri.UnescapeDataString(song));
        if (song is not null) radio.UpdateMetadata(Uri.UnescapeDataString(song));
        await WriteAsync(stream, "HTTP/1.0 200 OK\r\nContent-Type: text/xml\r\n\r\n", ct);
    }

    private async Task<bool> IsOwnerAsync(string username, string password) {
        if (string.IsNullOrEmpty(username)) return false;
        var dbUser = await mongo.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
        if (dbUser is null) return false;
        if (!string.Equals(dbUser.Role, "owner", StringComparison.OrdinalIgnoreCase)) return false;
        return BCrypt.Net.BCrypt.Verify(password, dbUser.PasswordHash);
    }

    // ---- tiny HTTP-ish helpers -------------------------------------------------

    private static async Task<(string method, string path, Dictionary<string, string> headers)?>
        ReadRequestHeadAsync(NetworkStream stream, CancellationToken ct) {
        var bytes = new List<byte>(512);
        var one = new byte[1];
        while (bytes.Count < 16384) {
            if (await stream.ReadAsync(one.AsMemory(0, 1), ct) == 0) break;
            bytes.Add(one[0]);
            var c = bytes.Count;
            if (c >= 4 && bytes[c - 4] == 13 && bytes[c - 3] == 10 && bytes[c - 2] == 13 && bytes[c - 1] == 10)
                break; // \r\n\r\n
        }

        var lines = Encoding.UTF8.GetString(bytes.ToArray())
            .Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length == 0) return null;

        var request = lines[0].Split(' ');
        if (request.Length < 2) return null;

        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in lines.Skip(1)) {
            var i = line.IndexOf(':');
            if (i > 0) headers[line[..i].Trim()] = line[(i + 1)..].Trim();
        }
        return (request[0].ToUpperInvariant(), request[1], headers);
    }

    private static bool TryGetBasicAuth(Dictionary<string, string> headers, out string user, out string pass) {
        user = pass = "";
        if (!headers.TryGetValue("Authorization", out var auth)) return false;
        if (!auth.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase)) return false;
        try {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(auth[6..].Trim()));
            var i = decoded.IndexOf(':');
            if (i < 0) return false;
            user = decoded[..i];
            pass = decoded[(i + 1)..];
            return true;
        } catch {
            return false;
        }
    }

    private static string? ParseQuery(string query, string key) {
        foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries)) {
            var eq = pair.IndexOf('=');
            var k = eq >= 0 ? pair[..eq] : pair;
            if (string.Equals(k, key, StringComparison.OrdinalIgnoreCase))
                return eq >= 0 ? pair[(eq + 1)..] : "";
        }
        return null;
    }

    private static async Task WriteAsync(NetworkStream stream, string text, CancellationToken ct) {
        await stream.WriteAsync(Encoding.UTF8.GetBytes(text), ct);
        await stream.FlushAsync(ct);
    }
}
