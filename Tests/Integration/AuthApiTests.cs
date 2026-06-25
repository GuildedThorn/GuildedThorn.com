using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace GuildedThorn.Tests.Integration;

[Collection("auth-api")]
public class AuthApiTests {

    private readonly AuthApiFixture _fixture;

    public AuthApiTests(AuthApiFixture fixture) => _fixture = fixture;

    // A fresh client (own cookie jar). BaseAddress is https so the Secure auth
    // cookie is stored and resent across requests.
    private HttpClient NewClient() =>
        _fixture.Factory!.CreateClient(new WebApplicationFactoryClientOptions {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });

    private static string NewUsername() => "user_" + Guid.NewGuid().ToString("N")[..10];

    private static async Task RegisterAsync(HttpClient client, string username, string password) {
        var res = await client.PostAsJsonAsync("/api/auth/register", new { username, password });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [SkippableFact]
    public async Task Register_Then_Login_IssuesCookie_AndMeNeverLeaksPasswordHash() {
        Skip.IfNot(_fixture.DockerAvailable, "Docker is not available.");
        var client = NewClient();

        var username = NewUsername();
        const string password = "Sup3rSecret!";
        await RegisterAsync(client, username, password);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.Contains("token=", string.Join(";", login.Headers.GetValues("Set-Cookie")));

        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("twoFactorRequired").GetBoolean());

        var me = await client.GetAsync("/api/user/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var meJson = await me.Content.ReadAsStringAsync();
        Assert.Contains(username, meJson);
        Assert.DoesNotContain("passwordhash", meJson, StringComparison.OrdinalIgnoreCase);

        var authMe = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, authMe.StatusCode);
        var authMeJson = await authMe.Content.ReadAsStringAsync();
        Assert.DoesNotContain("passwordhash", authMeJson, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task Login_WithWrongPassword_Returns401() {
        Skip.IfNot(_fixture.DockerAvailable, "Docker is not available.");
        var client = NewClient();

        var username = NewUsername();
        await RegisterAsync(client, username, "correct-horse-battery");

        var res = await client.PostAsJsonAsync("/api/auth/login",
            new { username, password = "wrong" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [SkippableFact]
    public async Task Me_WithoutCookie_ReturnsNoContent() {
        Skip.IfNot(_fixture.DockerAvailable, "Docker is not available.");
        var client = NewClient();

        // /api/user/me is unauthenticated-friendly: it returns 204 No Content for
        // anonymous callers (no token) so the SPA can probe auth state on mount
        // without logging a 401. See commit 684e385.
        var res = await client.GetAsync("/api/user/me");
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
    }

    [SkippableFact]
    public async Task EnablingTwoFactor_WithoutASecurityKey_IsRejected() {
        Skip.IfNot(_fixture.DockerAvailable, "Docker is not available.");
        var client = NewClient();

        var username = NewUsername();
        const string password = "pw-123456";
        await RegisterAsync(client, username, password);
        await client.PostAsJsonAsync("/api/auth/login", new { username, password });

        // No keys registered → server must refuse to enable 2FA (lockout guard).
        var res = await client.PostAsJsonAsync("/api/webauthn/two-factor", new { enabled = true });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
