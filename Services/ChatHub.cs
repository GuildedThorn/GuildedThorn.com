using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;

namespace GuildedThorn.com.Services;

// Anyone may connect and read the live chat; posting requires auth, and the
// owner role gets moderation methods (delete, ban, anti-raid, clear).
[AllowAnonymous]
public class ChatHub(
    ChatService chat,
    ChatModerationService mod,
    MongoDbService mongo) : Hub {

    private const int MaxMessageLength = 500;

    private string? CurrentUsername =>
        Context.User?.Identity?.Name
        ?? Context.User?.FindFirst("name")?.Value
        ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Name)?.Value;

    [Authorize]
    public async Task SendMessage(string content) {
        if (string.IsNullOrWhiteSpace(content)) return;
        content = content.Trim();
        if (content.Length > MaxMessageLength) content = content[..MaxMessageLength];

        var username = CurrentUsername;
        if (string.IsNullOrEmpty(username)) throw new HubException("Not authenticated.");
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        // Pull the live avatar + account age for this user.
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();

        var reason = mod.CheckCanSend(username, user?.CreatedAt ?? DateTime.MinValue);
        if (reason is not null) {
            await Clients.Caller.SendAsync("ChatError", reason);
            return;
        }

        var message = new ChatMessage {
            User = username,
            Content = content,
            Timestamp = DateTime.UtcNow,
            AvatarUrl = user?.AvatarUrl,
            Role = role,
        };
        await chat.StoreMessageAsync(message);
        mod.RecordSent(username);

        await Clients.All.SendAsync("ReceiveMessage", new {
            id = message.Id,
            user = message.User,
            content = message.Content,
            timestamp = message.Timestamp,
            avatarUrl = message.AvatarUrl,
            role = message.Role,
        });
    }

    // ---- Owner moderation -----------------------------------------------------

    [Authorize(Roles = "owner")]
    public async Task DeleteMessage(string id) {
        if (string.IsNullOrWhiteSpace(id)) return;
        await chat.DeleteMessageAsync(id);
        await Clients.All.SendAsync("MessageDeleted", id);
    }

    [Authorize(Roles = "owner")]
    public async Task BanUser(string username) {
        if (string.IsNullOrWhiteSpace(username)) return;
        await mod.BanAsync(username, CurrentUsername);
        await chat.DeleteByUserAsync(username);
        await Clients.All.SendAsync("UserBanned", username);
    }

    [Authorize(Roles = "owner")]
    public async Task UnbanUser(string username) {
        if (string.IsNullOrWhiteSpace(username)) return;
        await mod.UnbanAsync(username);
        await Clients.Caller.SendAsync("UserUnbanned", username);
    }

    [Authorize(Roles = "owner")]
    public async Task SetAntiRaid(bool on) {
        mod.SetAntiRaid(on);
        await Clients.All.SendAsync("AntiRaidChanged", on);
    }

    [Authorize(Roles = "owner")]
    public async Task ClearChat() {
        await chat.ClearAllAsync();
        await Clients.All.SendAsync("ChatCleared");
    }
}
