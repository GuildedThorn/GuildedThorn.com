using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Testcontainers.MongoDb;
using Xunit;

namespace GuildedThorn.Tests.Integration;

// Boots the REAL application (full middleware pipeline + controllers) via
// WebApplicationFactory, backed by an ephemeral MongoDB started with
// Testcontainers. Requires Docker to be running.
//
// Config that Program.cs reads at startup is supplied through environment
// variables (AddEnvironmentVariables is in the config chain). The Mixxx source
// listener is removed so the test host doesn't try to reach 127.0.0.1:8000.
public sealed class AuthApiFixture : IAsyncLifetime {

    private MongoDbContainer? _mongo;

    public bool DockerAvailable { get; private set; }
    public WebApplicationFactory<Program>? Factory { get; private set; }

    public async Task InitializeAsync() {
        try {
            _mongo = new MongoDbBuilder().WithImage("mongo:7.0").Build();
            await _mongo.StartAsync();
            DockerAvailable = true;
        } catch {
            // No Docker daemon (e.g. local dev without Docker) — the integration
            // tests Skip instead of failing. CI runners have Docker.
            DockerAvailable = false;
            return;
        }

        Environment.SetEnvironmentVariable("MongoDB__ConnectionString", _mongo.GetConnectionString());
        Environment.SetEnvironmentVariable("MongoDB__DatabaseName", "guildedthorn_test");
        Environment.SetEnvironmentVariable(
            "Jwt__Key",
            Convert.ToBase64String(Encoding.UTF8.GetBytes("integration-test-signing-key-32bytes!!")));
        Environment.SetEnvironmentVariable("Jwt__Issuer", "test-issuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "test-audience");
        Environment.SetEnvironmentVariable("Loki__Uri", "http://localhost:3100");

        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => {
            builder.UseEnvironment("Testing");
            builder.ConfigureTestServices(services => {
                // The Mixxx source listener connects to 127.0.0.1:8000 — drop it.
                foreach (var d in services
                    .Where(s => s.ImplementationType == typeof(RadioSourceListener))
                    .ToList()) {
                    services.Remove(d);
                }
            });
        });

        // Force the host to build now so failures surface in setup, not mid-test.
        _ = Factory.Services;
    }

    public async Task DisposeAsync() {
        if (Factory is not null) await Factory.DisposeAsync();
        if (_mongo is not null) await _mongo.DisposeAsync();
    }
}

[CollectionDefinition("auth-api")]
public sealed class AuthApiCollection : ICollectionFixture<AuthApiFixture> { }
