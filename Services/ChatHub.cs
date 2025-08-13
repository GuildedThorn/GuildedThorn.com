using System;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GuildedThorn.com.Services;

[Authorize]
public class ChatHub: Hub {

    public override async Task OnConnectedAsync() {
        var username = Context.User?.FindFirst(JwtRegisteredClaimNames.Name)?.Value;        
        if (username != null) {
            // Use the username as needed (e.g., log, store in a connection dictionary, etc.)
            Console.WriteLine($"User connected: {username}");
        }

        await base.OnConnectedAsync();
    }

    public async Task SendMessage(ChatMessage message) {
        // Retrieve username from JWT token (accessed via claims)
        var username = Context.User?.FindFirst(JwtRegisteredClaimNames.Name)?.Value;
        if (username == null) {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        // Send the message with the username
        await Clients.All.SendAsync("ReceiveMessage", username, message.Content, DateTime.Now.ToString("HH:mm:ss"));
    }
}