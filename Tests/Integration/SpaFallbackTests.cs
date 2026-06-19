using System;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace GuildedThorn.Tests.Integration;

public sealed class SpaFallbackTests {

    private static WebApplicationFactory<Program> CreateFactory() {
        Environment.SetEnvironmentVariable(
            "Jwt__Key",
            Convert.ToBase64String(Encoding.UTF8.GetBytes("integration-test-signing-key-32bytes!!")));
        Environment.SetEnvironmentVariable("Jwt__Issuer", "test-issuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "test-audience");
        Environment.SetEnvironmentVariable("Loki__Uri", "http://localhost:3100");

        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder => {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services => {
                foreach (var d in services
                    .Where(s => s.ServiceType == typeof(IHostedService)
                        && s.ImplementationType == typeof(RadioSourceListener))
                    .ToList()) {
                    services.Remove(d);
                }
            });
        });
    }

    [Theory]
    [InlineData("/404")]
    [InlineData("/this-route-does-not-exist")]
    public async Task NotFoundSpaRoutes_ReturnHttp404(string path) {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("text/html; charset=utf-8", response.Content.Headers.ContentType?.ToString());
    }

    [Fact]
    public async Task KnownSpaRoute_ReturnsHttp200() {
        await using var factory = CreateFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });

        var response = await client.GetAsync("/projects");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html; charset=utf-8", response.Content.Headers.ContentType?.ToString());
    }
}
