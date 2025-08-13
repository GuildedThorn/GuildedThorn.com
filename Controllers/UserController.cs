using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class UserController(MongoDbService mongoDbService) : ControllerBase {
    
    [Authorize(Policy = "PrivilegedOnly")]
    [HttpGet("me")]
    public async Task<IActionResult> GetUserData() {
        
        // Extract the username from the token claims
        var username = User.FindFirst("name")?.Value;
    
        if (string.IsNullOrEmpty(username)) {
            return Unauthorized("Username is missing from the token.");
        }

        // Retrieve user data from your MongoDB collection by username
        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
    
        if (user == null) {
            return NotFound("User not found.");
        }

        // Customize the response data as needed
        var response = new {
            name = user.Username
        };

        return Ok(response);
    }
    
    [Authorize(Policy = "PrivilegedOnly")]
    [HttpPatch("updateData")]
    public async Task<IActionResult> UpdateUserData([FromBody] UpdateUserRequest request) {
        var username = User.FindFirst("name")?.Value;

        if (string.IsNullOrEmpty(username)) {
            return Unauthorized("Username is missing from the token.");
        }

        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();

        if (user == null) {
            return NotFound("User not found.");
        }

        // Sanitize and normalize inputs
        if (!string.IsNullOrWhiteSpace(request.Email)) {
            request.Email = request.Email.Trim();

            // Validate email format
            try
            {
                var addr = new System.Net.Mail.MailAddress(request.Email);
                if (addr.Address != request.Email)
                    return BadRequest("Invalid email format.");
            }
            catch
            {
                return BadRequest("Invalid email format.");
            }

            user.Email = request.Email;
        }

        if (!string.IsNullOrWhiteSpace(request.FirstName))
        {
            request.FirstName = request.FirstName.Trim();
            user.FirstName = char.ToUpper(request.FirstName[0]) + request.FirstName.Substring(1).ToLower();
        }

        if (!string.IsNullOrWhiteSpace(request.LastName))
        {
            request.LastName = request.LastName.Trim();
            user.LastName = char.ToUpper(request.LastName[0]) + request.LastName.Substring(1).ToLower();
        }

        // Save updated user
        await mongoDbService.GetUserCollection().ReplaceOneAsync(u => u.Id == user.Id, user);

        return Ok(new { message = "User data updated successfully." });
    }
}