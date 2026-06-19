using System;
using System.Collections.Concurrent;

namespace GuildedThorn.com.Services;

// Short-lived store for in-flight WebAuthn ceremony options, keyed by a GUID
// handed to the client at "begin" and returned at "finish". In-memory because
// ceremonies last seconds — losing them on restart is acceptable.
public class WebAuthnChallengeStore {

    private sealed record Entry(string OptionsJson, string? Username, DateTime Expires);

    private readonly ConcurrentDictionary<string, Entry> _store = new();
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public string Put(string optionsJson, string? username) {
        var id = Guid.NewGuid().ToString("N");
        _store[id] = new Entry(optionsJson, username, DateTime.UtcNow.Add(Ttl));
        Sweep();
        return id;
    }

    public (string OptionsJson, string? Username)? Take(string id) {
        if (_store.TryRemove(id, out var e) && e.Expires > DateTime.UtcNow)
            return (e.OptionsJson, e.Username);
        return null;
    }

    private void Sweep() {
        var now = DateTime.UtcNow;
        foreach (var kv in _store)
            if (kv.Value.Expires <= now) _store.TryRemove(kv.Key, out _);
    }
}
