using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.Serializers;

namespace GuildedThorn.com.Models;

public class GalleryImage {

    public string Id { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    // EXIF / photo metadata, e.g. {"Camera": "Canon EOS Rebel XT", "Aperture": "f/6.3"}
    [BsonSerializer(typeof(StringDictionarySerializer))]
    public Dictionary<string, string> MetaData { get; set; } = new();

    public List<string> Tags { get; set; } = new();

    public string FileType { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Serializes MetaData as a BSON document of string→string. Reads tolerantly:
/// legacy values (older documents stored MetaData as an array or string) are
/// treated as empty instead of throwing, and become a proper document on the
/// next save.
/// </summary>
public class StringDictionarySerializer : SerializerBase<Dictionary<string, string>>
{
    public override Dictionary<string, string> Deserialize(
        BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        var reader = context.Reader;
        var dict = new Dictionary<string, string>();

        if (reader.GetCurrentBsonType() == BsonType.Document)
        {
            reader.ReadStartDocument();
            while (reader.ReadBsonType() != BsonType.EndOfDocument)
            {
                var name = reader.ReadName();
                if (reader.GetCurrentBsonType() == BsonType.String)
                    dict[name] = reader.ReadString();
                else
                    reader.SkipValue();
            }
            reader.ReadEndDocument();
        }
        else
        {
            // Legacy array/string/null — discard and start fresh.
            reader.SkipValue();
        }

        return dict;
    }

    public override void Serialize(
        BsonSerializationContext context, BsonSerializationArgs args, Dictionary<string, string> value)
    {
        var writer = context.Writer;
        writer.WriteStartDocument();
        if (value != null)
        {
            foreach (var kv in value)
            {
                writer.WriteName(kv.Key);
                writer.WriteString(kv.Value ?? string.Empty);
            }
        }
        writer.WriteEndDocument();
    }
}
