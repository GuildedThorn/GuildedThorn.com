using System.Linq;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class ChatController(ChatService chat, ChatModerationService mod) : ControllerBase {

    // Initial chat load: recent messages (oldest-first) + current anti-raid state.
    [AllowAnonymous]
    [HttpGet("history")]
    public async Task<IActionResult> History() {
        var messages = await chat.GetRecentMessagesAsync(100);
        return Ok(new {
            antiRaid = mod.AntiRaid,
            messages = messages.Select(m => new {
                id = m.Id,
                user = m.User,
                content = m.Content,
                timestamp = m.Timestamp,
                avatarUrl = m.AvatarUrl,
                role = m.Role,
            }),
        });
    }

    // Owner-only: list currently banned usernames (for an unban UI).
    [Authorize(Roles = "owner")]
    [HttpGet("bans")]
    public IActionResult Bans() => Ok(mod.BannedUsers());
}
