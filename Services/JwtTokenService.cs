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

    private string Issuer => config["Jwt:Issuer"]!;
    private string Audience => config["Jwt:Audience"]!;
    private string StageAudience => $"{Audience}:surroundstage";

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

    /// <summary>
    /// A short-lived, narrow credential for a SurroundStage room. It cannot
    /// authenticate to the website APIs because it has a separate audience
    /// and an explicit stage-only scope.
    /// </summary>
    public string GenerateStageToken(User user, TimeSpan? lifetime = null) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Name, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, user.Role),
            new("scope", "surroundstage"),
        };
        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: StageAudience,
            claims: claims,
            notBefore: DateTime.UtcNow.AddSeconds(-5),
            expires: DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromMinutes(10)),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateStageToken(string token) {
        if (string.IsNullOrWhiteSpace(token)) return null;
        try {
            return new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = Issuer,
                ValidAudience = StageAudience,
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.FromSeconds(15),
                NameClaimType = JwtRegisteredClaimNames.Name,
                RoleClaimType = ClaimTypes.Role,
            }, out _);
        } catch {
            return null;
        }
    }
}
