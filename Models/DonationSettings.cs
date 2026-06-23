using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace GuildedThorn.com.Models;

// Single-document collection holding the owner-controlled kill switch. While
// Published is false the donate UI is hidden from everyone except the owner, who
// can flip it live from the OwnerBar (no redeploy).
public class DonationSettings {

    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public bool Published { get; set; }
}
