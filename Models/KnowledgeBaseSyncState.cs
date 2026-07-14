using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace GuildedThorn.com.Models;

// Singleton doc (one row) tracking the last commit the KB sync engine parsed,
// so a restart doesn't force a full re-parse when nothing changed upstream.
public class KnowledgeBaseSyncState {

        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        public string LastSyncedCommitSha { get; set; } = string.Empty;
}
