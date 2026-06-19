using System;

namespace GuildedThorn.com.Models;

// A user banned from the live chat. Persisted so bans survive restarts.
public class ChatBan {
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Username { get; set; } = string.Empty;
    public string? BannedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
