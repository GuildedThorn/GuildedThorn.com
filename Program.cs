using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Sinks.Grafana.Loki;

// ---------- Load env first ----------
DotNetEnv.Env.Load(".env");

// ---------- Create builder ----------
var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

// Merge config from appsettings + config.json + .env
builder.Configuration
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("Resources/config.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();
var configuration = builder.Configuration;

// ---------- Logging ----------
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
    )
    .WriteTo.GrafanaLoki(
        uri: configuration["Loki:Uri"] 
             ?? throw new InvalidOperationException("Loki URI not configured."),
        labels: [
            new LokiLabel { Key = "app", Value = "guildedthorn.com" },
            new LokiLabel { Key = "env", Value = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "dev" },
            new LokiLabel { Key = "machine", Value = Environment.MachineName }
        ])
    .CreateLogger();

builder.Host.UseSerilog();

// ---------- Services ----------
services.Configure<SpotifySettings>(configuration.GetSection("Spotify"));
services.AddHttpClient();
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

// ---- JWT signing key ----
var keyBytes = Convert.FromBase64String(
    configuration["Jwt:Key"] 
    ?? throw new InvalidOperationException("JWT signing key not configured."));
var key = new SymmetricSecurityKey(keyBytes);

services.AddHttpContextAccessor();
services.AddSingleton(key);
services.AddSingleton(new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

// ---- CORS ----
services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins(
                "https://localhost:7101",
                "http://localhost:5000",
                "https://localhost:5000",
                "https://0.0.0.0:5000",
                "https://guildedthorn.com")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ---- Auth ----
services.AddAuthorizationBuilder()
    .AddPolicy("PrivilegedOnly", p => p.RequireRole("owner", "user"));

services.AddAuthentication(options => {
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = configuration["Jwt:Issuer"],
            ValidAudience = configuration["Jwt:Audience"],
            IssuerSigningKey = key,
            NameClaimType = "name"
        };
        options.Events = new JwtBearerEvents {
            OnMessageReceived = ctx => {
                if (ctx.Request.Cookies.TryGetValue("token", out var token))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

// ---- HttpClient for Spotify ----
services.AddHttpClient("Spotify", client =>
    client.Timeout = TimeSpan.FromSeconds(10));

// ---- OpenIddict client (stubbed) ----
services.AddOpenIddict().AddCore(_ => { });

// ---- SignalR ----
services.AddSignalR(hubOpts => {
        hubOpts.EnableDetailedErrors = true;
        hubOpts.ClientTimeoutInterval = TimeSpan.FromMinutes(2);
    })
    .AddJsonProtocol(opts => { opts.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase; });

// ---- Custom services ----
services.AddSingleton<MongoDbService>();
services.AddSingleton<RabbitMqService>();
services.AddScoped<ChatService>();
services.AddSingleton<RadioService>();

// ---------- Build ----------
var app = builder.Build();

// ---------- Middleware ----------
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowFrontend");

// ---- Auth must be after CORS & before endpoints ----
app.UseAuthentication();
app.UseAuthorization();

// ---- Hubs & Controllers ----
app.MapHub<ChatHub>("/chathub").RequireCors("AllowFrontend");
app.MapControllers().RequireCors("AllowFrontend");

app.MapFallbackToFile("index.html");

app.Run();
