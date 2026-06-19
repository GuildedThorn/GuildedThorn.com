using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Text;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace GuildedThorn.Tests;

public class JwtTokenServiceTests {

    private static JwtTokenService MakeService() {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("test-signing-key-at-least-32-bytes-long!!"));
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience",
            })
            .Build();
        return new JwtTokenService(key, config);
    }

    private static User MakeUser() => new() {
        Id = "u1",
        Username = "thorn",
        PasswordHash = "irrelevant",
        Role = "owner",
        Permissions = new List<string> { "Test" },
    };

    [Fact]
    public void Generate_EmitsExpectedClaims() {
        var token = MakeService().Generate(MakeUser());
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal("test-issuer", jwt.Issuer);
        Assert.Contains(jwt.Claims, c => c.Type == "name" && c.Value == "thorn");
        Assert.Contains(jwt.Claims, c => c.Value == "owner");           // role
        Assert.Contains(jwt.Claims, c => c.Type == "permissions" && c.Value == "Test");
    }

    [Fact]
    public void Generate_NeverLeaksPasswordHash() {
        var token = MakeService().Generate(MakeUser());
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.DoesNotContain(jwt.Claims, c => c.Value == "irrelevant");
    }

    [Fact]
    public void Generate_ExpiresAboutOneDayOut() {
        var token = MakeService().Generate(MakeUser());
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        var hours = (jwt.ValidTo - DateTime.UtcNow).TotalHours;
        Assert.InRange(hours, 23, 25);
    }
}
