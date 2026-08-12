using System;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using GuildedThorn.com.Models;

namespace GuildedThorn.com.Services;

/// <summary>
/// In-memory OAuth-style device flow for SurroundStage. The browser approves
/// a human-friendly code using the website session; the headset polls with a
/// separate high-entropy secret and receives only a short-lived stage token.
/// </summary>
public sealed class StageDeviceCodeService(JwtTokenService tokens) {
    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);

    private sealed class Entry {
        public required string DeviceCode { get; init; }
        public required string UserCode { get; init; }
        public required DateTimeOffset ExpiresAt { get; init; }
        public string? Token { get; set; }
        public string? Username { get; set; }
    }

    public sealed record StartResult(string DeviceCode, string UserCode, DateTimeOffset ExpiresAt);
    public sealed record PollResult(string Status, string? Token = null, string? Username = null,
        DateTimeOffset? ExpiresAt = null);

    private readonly ConcurrentDictionary<string, Entry> _byDevice = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _deviceByUserCode = new(StringComparer.OrdinalIgnoreCase);

    public StartResult Start() {
        PruneExpired();
        string deviceCode = Base64Url(RandomNumberGenerator.GetBytes(32));
        string userCode;
        do {
            userCode = MakeUserCode();
        } while (_deviceByUserCode.ContainsKey(userCode));

        var entry = new Entry {
            DeviceCode = deviceCode,
            UserCode = userCode,
            ExpiresAt = DateTimeOffset.UtcNow.Add(Lifetime),
        };
        _byDevice[deviceCode] = entry;
        _deviceByUserCode[userCode] = deviceCode;
        return new StartResult(deviceCode, userCode, entry.ExpiresAt);
    }

    public bool Approve(string userCode, User user) {
        PruneExpired();
        string normalized = NormalizeUserCode(userCode);
        if (!_deviceByUserCode.TryGetValue(normalized, out string? deviceCode)
            || !_byDevice.TryGetValue(deviceCode, out var entry)
            || entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return false;

        lock (entry) {
            // A displayed code is single-account: a second browser cannot
            // replace an approval that is waiting for the headset to poll.
            if (entry.Token is not null) return false;
            entry.Token = tokens.GenerateStageToken(user);
            entry.Username = user.Username;
            return true;
        }
    }

    public PollResult Poll(string deviceCode) {
        PruneExpired();
        if (!_byDevice.TryGetValue(deviceCode, out var entry))
            return new PollResult("expired");
        lock (entry) {
            if (entry.Token is null)
                return new PollResult("pending", ExpiresAt: entry.ExpiresAt);

            _byDevice.TryRemove(deviceCode, out _);
            _deviceByUserCode.TryRemove(entry.UserCode, out _);
            return new PollResult("approved", entry.Token, entry.Username, entry.ExpiresAt);
        }
    }

    private void PruneExpired() {
        var now = DateTimeOffset.UtcNow;
        foreach (var (deviceCode, entry) in _byDevice)
            if (entry.ExpiresAt <= now && _byDevice.TryRemove(deviceCode, out _))
                _deviceByUserCode.TryRemove(entry.UserCode, out _);
    }

    private static string MakeUserCode() {
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);
        Span<char> chars = stackalloc char[9];
        for (int i = 0; i < 8; i++)
            chars[i + (i >= 4 ? 1 : 0)] = Alphabet[bytes[i] % Alphabet.Length];
        chars[4] = '-';
        return new string(chars);
    }

    public static string NormalizeUserCode(string code) {
        string compact = (code ?? "").Trim().Replace("-", "", StringComparison.Ordinal).ToUpperInvariant();
        return compact.Length == 8 ? compact.Insert(4, "-") : "";
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
