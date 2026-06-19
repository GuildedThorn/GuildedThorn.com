#nullable enable

using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(MongoDbService mongoDbService, SymmetricSecurityKey key, IConfiguration config) : ControllerBase {
    
    // Get the currently logged-in user (based on the JWT token)
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe() {
        var username = User.FindFirst("name")?.Value;

        if (string.IsNullOrEmpty(username)) {
            return Unauthorized("Username is missing from the token.");
        }

        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();

        if (user == null) return NotFound("User not found.");

        return Ok(ToSafeUser(user));
    }

    // Project a User to a client-safe shape — never expose PasswordHash.
    private static object ToSafeUser(User u) => new {
        id = u.Id,
        name = u.Username,
        username = u.Username,
        role = u.Role,
        avatarUrl = u.AvatarUrl,
        firstName = u.FirstName,
        lastName = u.LastName,
        email = u.Email,
        permissions = u.Permissions,
        twoFactorEnabled = u.TwoFactorEnabled,
        createdAt = u.CreatedAt,
    };

    [HttpGet("check")]
    public IActionResult CheckAuthentication() {
        var token = Request.Cookies["token"];
    
        if (string.IsNullOrEmpty(token) || !IsValidToken(token))
        {
            return Unauthorized();
        }

        return Ok();
    }

    // Example implementation of IsValidToken
    private static bool IsValidToken(string token) {
        // Replace this with your actual token validation logic.
        // For example, you might decode the JWT and verify its signature,
        // expiration, and other claims.
        try {
            var jwtTokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = jwtTokenHandler.ReadToken(token) as JwtSecurityToken;

            if (jwtToken == null)
            { 
                return false;
            }

            // Validate expiration
            return jwtToken.ValidTo >= DateTime.UtcNow;
            // Add other validation logic as necessary (e.g., 1`F, issuer, etc.)
        }
        catch {
            return false;
        }
    }
    
    // Example: Login endpoint using MongoDB to fetch user data
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest) {
        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == loginRequest.Username)
            .FirstOrDefaultAsync();

        if (user == null || !BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.PasswordHash)) {
            return Unauthorized("Invalid credentials.");
        }

        if (user.TwoFactorEnabled) {
            // Password is correct, but a security key is required. Don't issue the
            // cookie yet — the client completes a WebAuthn assertion next.
            return Ok(new { twoFactorRequired = true });
        }

        // Generate a JWT Token and send it in the response
        var token = GenerateJwtToken(user);  // Implement your JWT generation logic
        // Set the token as an HttpOnly cookie
        var cookieOptions = new CookieOptions {
            HttpOnly = true,
            Secure = true, // Ensure this is set to true in production
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(1) // Set expiration to match the token expiration
        };

        Response.Cookies.Append("token", token, cookieOptions);

        return Ok(new { twoFactorRequired = false });
    }
    
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<IActionResult> RegisterUser([FromBody] RegisterRequest registerRequest) {
        
        // Check if user already exists
        var existingUser = await mongoDbService.GetUserCollection()
            .Find(u => u.Username == registerRequest.Username)
            .FirstOrDefaultAsync();

        if (existingUser != null) {
            return Conflict("User already exists.");
        }
        
        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(registerRequest.Password, workFactor: 10);

        var myuuid = Guid.NewGuid();
        var id = myuuid.ToString();
        
        var user = new User() {
            Id = id,
            Username = registerRequest.Username,
            PasswordHash = passwordHash,
            Role = "user",
            Permissions = ["Test"],
            CreatedAt = DateTime.Now
        };
        
        // Save to MongoDB
        await mongoDbService.GetUserCollection().InsertOneAsync(user);

        return Ok(new { Message = "User registered successfully." });
    }
    
        
    // [HttpPost("registerFirstOwner")]
    // public async Task<IActionResult> RegisterFirstOwner([FromBody] RegisterRequest registerRequest) {
    //     // Check if user already exists
    //     var existingUser = await mongoDbService.GetUserCollection()
    //         .Find(u => u.Username == registerRequest.Username)
    //         .FirstOrDefaultAsync();
    //
    //     if (existingUser != null) {
    //         return Conflict("User already exists.");
    //     }
    //     
    //     // Hash password
    //     var passwordHash = BCrypt.Net.BCrypt.HashPassword(registerRequest.Password, workFactor: 10);
    //
    //     var myuuid = Guid.NewGuid();
    //     var id = myuuid.ToString();
    //     
    //     var user = new User() {
    //         Id = id,
    //         Username = registerRequest.Username,
    //         PasswordHash = passwordHash,
    //         Role = "owner",
    //         Permissions = ["Test"],
    //         CreatedAt = DateTime.Now
    //     };
    //     
    //     // Save to MongoDB
    //     await mongoDbService.GetUserCollection().InsertOneAsync(user);
    //
    //     return Ok(new { Message = "User registered successfully." });
    // }
    
    private string GenerateJwtToken(User user) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Name, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, user.Role),
            new("permissions", string.Join(",", user.Permissions)) // Add permissions if necessary
        };

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1), // match the auth cookie lifetime
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    
    // Get the currently logged-in user (based on the JWT token)
    private User? GetCurrentUser() {
        var userId = User.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
        if (userId == null) return null;

        var user = mongoDbService.GetUserCollection()
            .Find(u => u.Id == userId)
            .FirstOrDefault();

        return user;
    }
    
    [Authorize(Roles = "owner")]
    [HttpGet("user/{id}")]
    public async Task<IActionResult> GetUser(string id) {
        var user = await mongoDbService.GetUserCollection()
            .Find(u => u.Id == id)
            .FirstOrDefaultAsync();

        if (user == null) {
            return NotFound();
        }

        return Ok(ToSafeUser(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() {
        if (Request.Cookies.ContainsKey("token")) {
            Response.Cookies.Delete("token"); }

        return Ok(new { Message = "Logged out successfully." });
    }
}