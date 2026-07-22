using System.Collections.Concurrent;
using System.Threading;

namespace GuildedThorn.com.Services;

// Ephemeral in-memory state for SurroundStage rooms: who is in which room,
// which peer is the host (beat-clock broadcaster), and the room's stream
// URL for late joiners. Rooms vanish when the last peer leaves — nothing
// here touches Mongo.

public sealed class StagePeer {
    public required int Id { get; init; }
    public required string ConnectionId { get; init; }
    public string Name { get; set; } = "guest";
    public float Hue { get; set; }
    public bool Verified { get; init; }
}

public sealed class StageRoom {
    public readonly ConcurrentDictionary<string, StagePeer> Peers = new();
    public string? StreamUrl;
    public int HostId = -1;
}

public sealed class StageRegistry {
    private readonly ConcurrentDictionary<string, StageRoom> _rooms = new();
    private int _nextPeerId;

    public int NextPeerId() => Interlocked.Increment(ref _nextPeerId);

    public StageRoom GetOrCreate(string room) => _rooms.GetOrAdd(room, _ => new StageRoom());

    public StageRoom? Get(string room) => _rooms.TryGetValue(room, out var r) ? r : null;

    public void CleanupIfEmpty(string room) {
        if (_rooms.TryGetValue(room, out var r) && r.Peers.IsEmpty)
            _rooms.TryRemove(room, out _);
    }
}
