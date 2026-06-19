using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace GuildedThorn.com.Services;

// Issues the same JWT cookie that password login uses, so alternative auth
// paths (WebAuthn / YubiKey) can log a user in identically. Mirrors
// AuthController.GenerateJwtToken — keep the two in sync.
public class JwtTokenService(SymmetricSecurityKey key, IConfiguration config) {

    public string Generate(User user) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Name, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, user.Role),
            new("permissions", string.Join(",", user.Permissions)),
        };

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1), // match the auth cookie lifetime
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public void IssueCookie(HttpResponse response, User user) {
        response.Cookies.Append("token", Generate(user), new CookieOptions {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(1),
        });
    }
}
