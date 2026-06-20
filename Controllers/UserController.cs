using System;
using System.IO;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class UserController(MongoDbService mongoDbService) : ControllerBase {
    
    // AllowAnonymous: the SPA calls this on every page load to hydrate auth
    // state. Authentication still runs, so a valid cookie populates the claims;
    // a logged-out visitor gets 204 (not 401) so the browser console stays clean.
    [AllowAnonymous]
    [HttpGet("me")]
    public async Task<IActionResult> GetUserData() {

        // Extract the username from the token claims
        var username = User.FindFirst("name")?.Value;

        if (string.IsNullOrEmpty(username)) {
            return NoContent();
        }

        // Retrieve user data from your MongoDB collection by username
        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();

        if (user == null) {
            return NoContent();
        }

        // Customize the response data as needed
        var response = new {
            name = user.Username,
            role = user.Role,
            avatarUrl = user.AvatarUrl
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

    [Authorize(Policy = "PrivilegedOnly")]
    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile? file) {
        var username = User.FindFirst("name")?.Value;
        if (string.IsNullOrEmpty(username)) {
            return Unauthorized("Username is missing from the token.");
        }

        if (file == null || file.Length == 0) {
            return BadRequest("No file uploaded.");
        }
        if (!file.ContentType.StartsWith("image/")) {
            return BadRequest("File must be an image.");
        }
        if (file.Length > 5 * 1024 * 1024) {
            return BadRequest("Image must be 5 MB or smaller.");
        }

        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
        if (user == null) {
            return NotFound("User not found.");
        }

        var ext = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) {
            ext = "png";
        }

        // Save to disk, named by user id so re-uploads overwrite.
        var savePath = Path.Combine("wwwroot/images/avatars", $"{user.Id}.{ext}");
        Directory.CreateDirectory(Path.GetDirectoryName(savePath)!);
        await using (var stream = new FileStream(savePath, FileMode.Create)) {
            await file.CopyToAsync(stream);
        }

        // Cache-busting version so updated avatars show immediately.
        user.AvatarUrl = $"/images/avatars/{user.Id}.{ext}?v={DateTime.UtcNow.Ticks}";
        await mongoDbService.GetUserCollection().ReplaceOneAsync(u => u.Id == user.Id, user);

        return Ok(new { avatarUrl = user.AvatarUrl });
    }
}