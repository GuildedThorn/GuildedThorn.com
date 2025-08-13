using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class ChatController(IHubContext<ChatHub> hubContext) : ControllerBase {
    
    [HttpPost]
    [Route("send")]
    public async Task<IActionResult> SendMessage([FromBody] ChatMessage message) { 
        if (string.IsNullOrEmpty(message.Content)) {
            return BadRequest("Message cannot be empty.");
        }
    
        // Send message to SignalR clients
        await hubContext.Clients.All.SendAsync("ReceiveMessage", "You", message.Content);
    
        return Ok();
    }
}