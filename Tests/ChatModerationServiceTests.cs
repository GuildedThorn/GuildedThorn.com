using System;
using System.Collections.Generic;
using GuildedThorn.com.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GuildedThorn.Tests;

// Covers the in-memory anti-raid / slow-mode logic (no DB needed). The service
// loads its ban list from Mongo in the constructor, wrapped in try/catch — a
// fast-failing connection string lets that load no-op so we can test the rest.
public class ChatModerationServiceTests {

    private static ChatModerationService MakeService() {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                ["MongoDB:ConnectionString"] =
                    "mongodb://localhost:1/?serverSelectionTimeoutMS=1&connectTimeoutMS=1",
                ["MongoDB:DatabaseName"] = "test",
            })
            .Build();
        var mongo = new MongoDbService(config);
        return new ChatModerationService(mongo, NullLogger<ChatModerationService>.Instance);
    }

    private static readonly DateTime Established = DateTime.UtcNow.AddDays(-30);

    [Fact]
    public void AntiRaidOff_AllowsAnySend() {
        var mod = MakeService();
        Assert.False(mod.AntiRaid);
        Assert.Null(mod.CheckCanSend("alice", DateTime.UtcNow)); // even a brand-new account
    }

    [Fact]
    public void AntiRaidOn_BlocksBrandNewAccounts() {
        var mod = MakeService();
        mod.SetAntiRaid(true);

        var reason = mod.CheckCanSend("newbie", DateTime.UtcNow); // age ~0 < 1 day
        Assert.NotNull(reason);
        Assert.Contains("new accounts", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AntiRaidOn_EstablishedAccount_FirstSendAllowed_ThenSlowMode() {
        var mod = MakeService();
        mod.SetAntiRaid(true);

        Assert.Null(mod.CheckCanSend("vet", Established)); // first send OK
        mod.RecordSent("vet");

        var reason = mod.CheckCanSend("vet", Established); // immediate retry
        Assert.NotNull(reason);
        Assert.Contains("slow", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AntiRaidOn_MissingCreatedAt_DoesNotCountAsNewAccount() {
        var mod = MakeService();
        mod.SetAntiRaid(true);

        // DateTime.MinValue (never persisted) must fail open, not be treated as new.
        Assert.Null(mod.CheckCanSend("legacy", DateTime.MinValue));
    }

    [Fact]
    public void SetAntiRaid_Off_ClearsSlowModeState() {
        var mod = MakeService();
        mod.SetAntiRaid(true);
        mod.RecordSent("u");

        mod.SetAntiRaid(false); // clears per-user last-sent timestamps
        mod.SetAntiRaid(true);  // back on — but the slow-mode timer was reset

        Assert.Null(mod.CheckCanSend("u", Established));
    }
}
