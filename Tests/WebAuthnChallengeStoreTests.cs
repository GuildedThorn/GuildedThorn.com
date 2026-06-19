using GuildedThorn.com.Services;
using Xunit;

namespace GuildedThorn.Tests;

public class WebAuthnChallengeStoreTests {

    [Fact]
    public void Take_ReturnsStoredEntry_ThenConsumesIt() {
        var store = new WebAuthnChallengeStore();
        var id = store.Put("{\"x\":1}", "alice");

        var first = store.Take(id);
        Assert.NotNull(first);
        Assert.Equal("{\"x\":1}", first!.Value.OptionsJson);
        Assert.Equal("alice", first.Value.Username);

        // Single-use: a second Take returns null.
        Assert.Null(store.Take(id));
    }

    [Fact]
    public void Take_UnknownId_ReturnsNull() {
        var store = new WebAuthnChallengeStore();
        Assert.Null(store.Take("does-not-exist"));
    }

    [Fact]
    public void Put_AllowsNullUsername_ForPasswordless() {
        var store = new WebAuthnChallengeStore();
        var id = store.Put("{}", null);

        var entry = store.Take(id);
        Assert.NotNull(entry);
        Assert.Null(entry!.Value.Username);
    }
}
