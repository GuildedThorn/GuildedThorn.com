using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GuildedThorn.com.Services;

// Multiplayer relay for SurroundStage (the walkable 7.1 club). Anyone may
// join a room; visitors logged in with a site account get their username as
// a verified, spoof-proof display name (the game sends the auth cookie on
// the hub connection, same as the SPA). The first peer in a room becomes
// the host: its beat clock, onsets, and stream URL drive every client's
// light show, replacing the old dedicated Godot analyzer server. The hub
// only relays — no audio and no analysis happen here.
//
// Client → server: Join, SetIdentity, Pose, StageSync, Onset, SetStream, Voice
// Server → client: Welcome, PeerJoined, PeerLeft, Identity, Pose, Stage,
//                  Onset, Stream, Host, Voice
[AllowAnonymous]
public class StageHub(StageRegistry registry) : Hub {

    private const int MaxNameLength = 24;
    private const int MaxRoomLength = 64;
    private const int PoseFloats = 18;      // head/left/right × position+rotation
    private const int VuBands = 8;
    private const int MaxSpectrumBands = 64;
    private const int MaxVoiceFrameBytes = 4096;

    private string? RoomName {
        get => Context.Items.TryGetValue("room", out var r) ? (string?)r : null;
        set => Context.Items["room"] = value;
    }

    private StagePeer? Me {
        get => Context.Items.TryGetValue("peer", out var p) ? (StagePeer?)p : null;
        set => Context.Items["peer"] = value;
    }

    private string? AccountName =>
        Context.User?.Identity?.IsAuthenticated == true ? Context.User.Identity!.Name : null;

    public async Task Join(string room, string name, float hue) {
        if (Me != null) return; // one join per connection

        room = string.IsNullOrWhiteSpace(room) ? "main" : room.Trim().ToLowerInvariant();
        if (room.Length > MaxRoomLength) room = room[..MaxRoomLength];

        var account = AccountName;
        var peer = new StagePeer {
            Id = registry.NextPeerId(),
            ConnectionId = Context.ConnectionId,
            Name = ClipName(account ?? name),
            Hue = hue,
            Verified = account != null,
        };

        var r = registry.GetOrCreate(room);
        r.Peers[Context.ConnectionId] = peer;
        Interlocked.CompareExchange(ref r.HostId, peer.Id, -1);
        RoomName = room;
        Me = peer;
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(room));

        // Roster as parallel-arrays-free rows: [id, name, hue, verified].
        var roster = r.Peers.Values
            .Where(p => p.Id != peer.Id)
            .Select(p => new object[] { p.Id, p.Name, p.Hue, p.Verified })
            .ToArray();
        await Clients.Caller.SendAsync("Welcome",
            peer.Id, peer.Name, peer.Verified, r.HostId, r.StreamUrl, roster);
        await Clients.OthersInGroup(GroupFor(room)).SendAsync("PeerJoined",
            peer.Id, peer.Name, peer.Hue, peer.Verified);
    }

    public Task SetIdentity(string name, float hue) {
        if (RoomName is not { } room || Me is not { } me) return Task.CompletedTask;
        if (!me.Verified) me.Name = ClipName(name); // verified names are the account's
        me.Hue = hue;
        return Clients.OthersInGroup(GroupFor(room)).SendAsync("Identity",
            me.Id, me.Name, me.Hue, me.Verified);
    }

    public Task Pose(float[] pose) {
        if (RoomName is not { } room || Me is not { } me) return Task.CompletedTask;
        if (pose is not { Length: PoseFloats }) return Task.CompletedTask;
        return Clients.OthersInGroup(GroupFor(room)).SendAsync("Pose", me.Id, pose);
    }

    public Task StageSync(int beatIndex, float phase, float energy,
        float[] vu, float[] spectrum, bool active) {
        if (!IsHost(out var room)) return Task.CompletedTask;
        if (vu is not { Length: VuBands }) return Task.CompletedTask;
        if (spectrum == null || spectrum.Length > MaxSpectrumBands) return Task.CompletedTask;
        return Clients.OthersInGroup(GroupFor(room)).SendAsync("Stage",
            beatIndex, phase, energy, vu, spectrum, active);
    }

    public Task Onset() {
        if (!IsHost(out var room)) return Task.CompletedTask;
        return Clients.OthersInGroup(GroupFor(room)).SendAsync("Onset");
    }

    public Task SetStream(string url) {
        if (!IsHost(out var room)) return Task.CompletedTask;
        if (string.IsNullOrWhiteSpace(url)) return Task.CompletedTask;
        url = url.Trim();
        // Only network sources make sense to share; local paths stay local.
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return Task.CompletedTask;
        var r = registry.Get(room);
        if (r == null) return Task.CompletedTask;
        r.StreamUrl = url;
        return Clients.OthersInGroup(GroupFor(room)).SendAsync("Stream", url);
    }

    public Task Voice(byte[] frame) {
        if (RoomName is not { } room || Me is not { } me) return Task.CompletedTask;
        if (frame is not { Length: > 0 and <= MaxVoiceFrameBytes }) return Task.CompletedTask;
        return Clients.OthersInGroup(GroupFor(room)).SendAsync("Voice", me.Id, frame);
    }

    public override async Task OnDisconnectedAsync(Exception? exception) {
        if (RoomName is { } room && Me is { } me && registry.Get(room) is { } r) {
            r.Peers.TryRemove(Context.ConnectionId, out _);
            await Clients.OthersInGroup(GroupFor(room)).SendAsync("PeerLeft", me.Id);

            // Host succession: oldest remaining peer inherits the beat clock.
            if (r.HostId == me.Id) {
                var next = r.Peers.Values.OrderBy(p => p.Id).FirstOrDefault();
                r.HostId = next?.Id ?? -1;
                if (next != null)
                    await Clients.Group(GroupFor(room)).SendAsync("Host", next.Id);
            }
            registry.CleanupIfEmpty(room);
        }
        await base.OnDisconnectedAsync(exception);
    }

    private bool IsHost(out string room) {
        room = RoomName ?? "";
        return RoomName is { } rn && Me is { } me
            && registry.Get(rn) is { } r && r.HostId == me.Id;
    }

    // Namespace the SignalR group so stage rooms can never collide with
    // groups other hubs might use.
    private static string GroupFor(string room) => $"stage:{room}";

    private static string ClipName(string? name) {
        name = string.IsNullOrWhiteSpace(name) ? "guest" : name.Trim();
        return name.Length <= MaxNameLength ? name : name[..MaxNameLength];
    }
}
