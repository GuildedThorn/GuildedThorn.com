using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace GuildedThorn.com.Models;

public class ChatMessage {
        
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("user")]
        public string User { get; set; } = null!;

        [BsonElement("content")]
        public string Content { get; set; } = null!;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; }

        public ChatMessage() { }

        public ChatMessage(string user, string content, DateTime timestamp) {
                User = user;
                Content = content;
                Timestamp = timestamp;
        }
}