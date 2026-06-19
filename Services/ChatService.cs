using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using MongoDB.Driver;

namespace GuildedThorn.com.Services;

// Services/ChatService.cs

public class ChatService {
    
    private readonly IMongoCollection<ChatMessage> _messages;

    public ChatService(MongoDbService dbService) {
        _messages = dbService.GetChatMessageCollection();
        
        // Create a TTL index for auto-deletion after 30 days
        var indexKeys = Builders<ChatMessage>.IndexKeys.Ascending(x => x.Timestamp);
        var indexOptions = new CreateIndexOptions { ExpireAfter = TimeSpan.FromDays(30) };
        _messages.Indexes.CreateOne(new CreateIndexModel<ChatMessage>(indexKeys, indexOptions));
    }

    public async Task StoreMessageAsync(ChatMessage message) {
        await _messages.InsertOneAsync(message);
    }

    // Oldest-first, ready to render in a chat window.
    public async Task<List<ChatMessage>> GetRecentMessagesAsync(int limit = 100) {
        var messages = await _messages.Find(_ => true)
            .SortByDescending(m => m.Timestamp)
            .Limit(limit)
            .ToListAsync();
        messages.Reverse();
        return messages;
    }

    public async Task DeleteMessageAsync(string id) {
        await _messages.DeleteOneAsync(m => m.Id == id);
    }

    public async Task DeleteByUserAsync(string username) {
        await _messages.DeleteManyAsync(m => m.User == username);
    }

    public async Task ClearAllAsync() {
        await _messages.DeleteManyAsync(_ => true);
    }
}