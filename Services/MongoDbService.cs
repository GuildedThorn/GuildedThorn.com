using GuildedThorn.com.Models;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;

namespace GuildedThorn.com.Services;

public class MongoDbService {
    
    private readonly IMongoDatabase _database;

    public MongoDbService(IConfiguration configuration) {
        var connectionString = configuration["MongoDB:ConnectionString"];
        var databaseName = configuration["MongoDB:DatabaseName"];

        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);
    }

    // Example: Getting a collection of users
    public IMongoCollection<User> GetUserCollection() {
        return _database.GetCollection<User>("Users");
    }
    
    public IMongoCollection<ChatMessage> GetChatMessageCollection() {
        return _database.GetCollection<ChatMessage>("Messages");
    }
    
    public IMongoCollection<GuestBookMessages> GetGuestBookCollection() {
        return _database.GetCollection<GuestBookMessages>("GuestBookMessages");
    }

    public IMongoCollection<ContactMessage> GetContactMessageCollection() {
        return _database.GetCollection<ContactMessage>("ContactMessages");
    }

    public IMongoCollection<WebAuthnCredential> GetWebAuthnCredentialCollection() {
        return _database.GetCollection<WebAuthnCredential>("WebAuthnCredentials");
    }

    public IMongoCollection<BlogPost> GetBlogPostCollection() {
        return _database.GetCollection<BlogPost>("BlogPosts");
    }
    
    public IMongoCollection<GalleryImage> GetGalleryImageCollection() {
        return _database.GetCollection<GalleryImage>("GalleryImages");
    }

    public IMongoCollection<PushSubscriptionDoc> GetPushSubscriptionCollection() {
        return _database.GetCollection<PushSubscriptionDoc>("PushSubscriptions");
    }

    public IMongoCollection<StreamEvent> GetStreamEventCollection() {
        return _database.GetCollection<StreamEvent>("StreamEvents");
    }

    public IMongoCollection<ChatBan> GetChatBanCollection() {
        return _database.GetCollection<ChatBan>("ChatBans");
    }

    public IMongoCollection<Donation> GetDonationCollection() {
        return _database.GetCollection<Donation>("Donations");
    }

    public IMongoCollection<DonationSettings> GetDonationSettingsCollection() {
        return _database.GetCollection<DonationSettings>("DonationSettings");
    }
}