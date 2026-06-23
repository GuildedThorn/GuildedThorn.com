using MongoDB.Bson.Serialization.Attributes;

namespace GuildedThorn.com.Models;

// Per-user accumulated watchtime, fed by client heartbeats. The username is the
// document id so heartbeats can $inc-upsert atomically without a lookup.
public class UserStats {

    [BsonId]
    public string Username { get; set; } = string.Empty;

    public long RadioSeconds { get; set; }

    public long StreamSeconds { get; set; }
}
