using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace GuildedThorn.com.Services;

// Owner-driven chat moderation: a persistent ban list plus an in-memory
// "anti-raid" mode. Anti-raid enforces a per-user slow mode and blocks
// brand-new accounts — the usual levers for riding out a spam wave.
public class ChatModerationService {

    private readonly MongoDbService _mongo;
    private readonly ILogger<ChatModerationService> _logger;

    // Mirrors the Mongo ban list in memory for cheap per-message checks.
    private readonly HashSet<string> _banned = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _banLock = new();

    // Per-user last-send time, used for slow mode while anti-raid is on.
    private readonly ConcurrentDictionary<string, DateTime> _lastSent =
        new(StringComparer.OrdinalIgnoreCase);

    public bool AntiRaid { get; private set; }
    public int AntiRaidSlowSeconds { get; } = 5;
    public TimeSpan AntiRaidMinAccountAge { get; } = TimeSpan.FromDays(1);

    public ChatModerationService(MongoDbService mongo, ILogger<ChatModerationService> logger) {
        _mongo = mongo;
        _logger = logger;

        // Warm the in-memory set from persisted bans.
        try {
            var bans = _mongo.GetChatBanCollection().Find(_ => true).ToList();
            foreach (var b in bans) _banned.Add(b.Username);
        } catch (Exception ex) {
            _logger.LogWarning(ex, "Failed to load chat bans");
        }
    }

    public bool IsBanned(string username) {
        lock (_banLock) return _banned.Contains(username);
    }

    public async Task BanAsync(string username, string? bannedBy) {
        lock (_banLock) _banned.Add(username);
        var update = Builders<ChatBan>.Update
            .Set(b => b.Username, username)
            .Set(b => b.BannedBy, bannedBy)
            .SetOnInsert(b => b.Id, Guid.NewGuid().ToString())
            .SetOnInsert(b => b.CreatedAt, DateTime.UtcNow);
        await _mongo.GetChatBanCollection().UpdateOneAsync(
            b => b.Username == username, update, new UpdateOptions { IsUpsert = true });
    }

    public async Task UnbanAsync(string username) {
        lock (_banLock) _banned.Remove(username);
        await _mongo.GetChatBanCollection().DeleteOneAsync(b => b.Username == username);
    }

    public IReadOnlyList<string> BannedUsers() {
        lock (_banLock) return _banned.ToList();
    }

    public void SetAntiRaid(bool on) {
        AntiRaid = on;
        if (!on) _lastSent.Clear();
    }

    // Returns null when the user may post, otherwise a human-readable reason.
    public string? CheckCanSend(string username, DateTime accountCreatedAt) {
        if (IsBanned(username)) return "You are banned from chat.";

        if (AntiRaid) {
            // Fail open if CreatedAt was never set (DateTime.MinValue) — never
            // block an established account just because the field is missing.
            if (accountCreatedAt > DateTime.MinValue &&
                DateTime.UtcNow - accountCreatedAt < AntiRaidMinAccountAge) {
                return "Anti-raid mode is on — new accounts can't chat right now.";
            }

            if (_lastSent.TryGetValue(username, out var last)) {
                var wait = AntiRaidSlowSeconds - (DateTime.UtcNow - last).TotalSeconds;
                if (wait > 0) return $"Slow mode: wait {Math.Ceiling(wait)}s.";
            }
        }

        return null;
    }

    public void RecordSent(string username) {
        if (AntiRaid) _lastSent[username] = DateTime.UtcNow;
    }
}
