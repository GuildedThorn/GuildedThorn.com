using System.Collections.Generic;
using System.Text;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace GuildedThorn.Tests;

public class StageDeviceCodeServiceTests {
    private static StageDeviceCodeService MakeService() {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("test-signing-key-at-least-32-bytes-long!!"));
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience",
            })
            .Build();
        return new StageDeviceCodeService(new JwtTokenService(key, config));
    }

    private static User User(string name) => new() {
        Id = name,
        Username = name,
        PasswordHash = "not-in-token",
        Role = "user",
        Permissions = [],
    };

    [Fact]
    public void DeviceFlow_IsPendingThenReturnsTokenOnce() {
        var service = MakeService();
        var started = service.Start();

        Assert.Matches("^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$", started.UserCode);
        Assert.Equal("pending", service.Poll(started.DeviceCode).Status);
        Assert.True(service.Approve(started.UserCode.ToLowerInvariant(), User("thorn")));

        var approved = service.Poll(started.DeviceCode);
        Assert.Equal("approved", approved.Status);
        Assert.Equal("thorn", approved.Username);
        Assert.False(string.IsNullOrWhiteSpace(approved.Token));
        Assert.Equal("expired", service.Poll(started.DeviceCode).Status);
    }

    [Fact]
    public void ApprovalCannotBeReassignedToAnotherAccount() {
        var service = MakeService();
        var started = service.Start();

        Assert.True(service.Approve(started.UserCode, User("first")));
        Assert.False(service.Approve(started.UserCode, User("second")));
        Assert.Equal("first", service.Poll(started.DeviceCode).Username);
    }
}
