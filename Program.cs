using System;
using System.IO;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Fido2NetLib;
using Microsoft.AspNetCore.RateLimiting;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Transforms;

// ---------- Load env first ----------
// Optional: container / CI / flake deploys supply real environment variables
// directly, so don't crash when there's no .env file on disk.
if (File.Exists(".env")) DotNetEnv.Env.Load(".env");

// ---------- Create builder ----------
var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

// Merge config from appsettings + config.json + .env
builder.Configuration
    .SetBasePath(AppContext.BaseDirectory)
    // Optional: env vars can supply every required key (the explicit null-checks
    // below still fail fast if a critical value is missing from all sources).
    .AddJsonFile("Resources/config.json", optional: true, reloadOnChange: true)
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
// Gallery uploads live outside wwwroot (see GalleryStorage) so frontend builds
// and publishes can't wipe them. Default: <ContentRoot>/data/gallery.
services.AddSingleton(new GalleryStorage(
    configuration["Storage:GalleryPath"]
        ?? Path.Combine(builder.Environment.ContentRootPath, "data", "gallery")));

services.Configure<SpotifySettings>(configuration.GetSection("Spotify"));
services.AddHttpClient();
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();
services.AddHealthChecks();

// ---- Live-stream reverse proxy ----
// Forwards same-origin /stream/* to the local Owncast media server so the live
// HLS video rides the existing Cloudflare tunnel (no extra hostname, no third-
// party cookies). RTMP ingest is separate — OBS pushes to Owncast on the LAN.
//   /stream/status            → Owncast /api/status   ({ online, viewers, title })
//   /stream/hls/{**rest}      → Owncast /hls/{**rest} (m3u8 playlist + segments)
// Owncast must not collide with the app's own port (8080 in prod), so default
// to 8090; override with Stream:OwncastUrl if the media server moves.
var owncastUrl = configuration["Stream:OwncastUrl"] ?? "http://127.0.0.1:8090";
services.AddReverseProxy().LoadFromMemory(
    [
        new RouteConfig {
            RouteId = "stream-status",
            ClusterId = "owncast",
            Match = new RouteMatch { Path = "/stream/status" },
        }.WithTransformPathSet("/api/status"),
        new RouteConfig {
            RouteId = "stream-hls",
            ClusterId = "owncast",
            Match = new RouteMatch { Path = "/stream/hls/{**remainder}" },
        }.WithTransformPathRemovePrefix("/stream/hls").WithTransformPathPrefix("/hls"),
    ],
    [
        new ClusterConfig {
            ClusterId = "owncast",
            Destinations = new Dictionary<string, DestinationConfig> {
                ["owncast"] = new() { Address = owncastUrl },
            },
        },
    ]);

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
services.AddSingleton<ChatModerationService>();
services.AddSingleton<RadioService>();
services.AddSingleton<PushNotificationService>();
services.AddSingleton<JwtTokenService>();
services.AddSingleton<DonationService>();

// ---- WebAuthn / FIDO2 (YubiKey) ----
// RP ID must be the site's registrable domain (no scheme/port); Origins must be
// the exact browser origins. Defaults target local dev; set Fido2:* in config
// for production (ServerDomain = "guildedthorn.com", Origins = "https://guildedthorn.com").
services.AddSingleton<WebAuthnChallengeStore>();
services.AddFido2(options => {
    options.ServerDomain = builder.Configuration["Fido2:ServerDomain"] ?? "localhost";
    options.ServerName = builder.Configuration["Fido2:ServerName"] ?? "GuildedThorn";
    var origins = builder.Configuration.GetSection("Fido2:Origins").Get<string[]>()
        ?? new[] { "https://localhost:5173" };
    options.Origins = new HashSet<string>(origins);
});
services.AddHostedService<RadioSourceListener>(); // Mixxx → backend source server (127.0.0.1:8000)

// ---- Forwarded headers (real client IP/scheme behind a reverse proxy) ----
// So rate limiting keys on the true client IP and logs/redirects use the right
// scheme. Assumes the app is only reachable through the proxy; if the app is
// directly exposed, set KnownProxies/KnownNetworks instead of clearing them.
services.Configure<ForwardedHeadersOptions>(options => {
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ---- HSTS (tell browsers to stick to HTTPS) ----
services.AddHsts(options => {
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

// ---- Rate limiting ----
// Per-IP fixed windows. "auth" guards login/registration from brute force;
// "contact" throttles the anonymous contact form against spam.
services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;

    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    options.AddPolicy("contact", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
            }));

    // "donate" throttles checkout-session creation per IP so the Stripe API
    // (and our keys) can't be hammered.
    options.AddPolicy("donate", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
            }));
});

// ---------- Build ----------
var app = builder.Build();

// ---------- Middleware ----------
// Must run first so the real client IP/scheme is known to everything below
// (rate limiter, HTTPS redirect, logging).
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HSTS only outside Development (localhost + HSTS caching is a nuisance in dev).
if (!app.Environment.IsDevelopment()) {
    app.UseHsts();
}

app.UseHttpsRedirection();

// ---- Security headers on every response ----
app.Use(async (context, next) => {
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none'; " +
        "frame-src 'self' https://challenges.cloudflare.com; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "media-src 'self' blob:; " +             // radio <audio> (self) + hls.js MSE (blob:)
        "style-src 'self' 'unsafe-inline'; " +  // React sets inline styles (e.g. language colors)
        "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; " +
        "connect-src 'self' https: wss:; " +     // /api, SignalR (wss), GitHub calendar
        "form-action 'self'; " +
        "upgrade-insecure-requests";
    await next();
});

// Cache-Control for static assets. Vite content-hashes everything under
// /assets/ (JS, CSS, fonts), so those are safe to cache for a year as
// immutable. index.html must always revalidate so a redeploy is picked up.
// Everything else (images, theme-init.js, manifest) gets a week.
void SetStaticCache(StaticFileResponseContext ctx)
{
    var resp = ctx.Context.Response;
    if (ctx.Context.Request.Path.StartsWithSegments("/assets"))
        resp.Headers.CacheControl = "public, max-age=31536000, immutable";
    else if (string.Equals(ctx.File.Name, "index.html", StringComparison.OrdinalIgnoreCase))
        resp.Headers.CacheControl = "no-cache";
    else
        resp.Headers.CacheControl = "public, max-age=604800";
}

app.UseStaticFiles(new StaticFileOptions { OnPrepareResponse = SetStaticCache });

// Serve uploaded gallery images from their out-of-wwwroot store at the same
// /images/gallery URL the frontend already requests.
app.UseStaticFiles(new StaticFileOptions {
    FileProvider = new PhysicalFileProvider(
        app.Services.GetRequiredService<GalleryStorage>().RootPath),
    RequestPath = "/images/gallery",
    OnPrepareResponse = SetStaticCache,
});

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseRateLimiter();

// ---- Auth must be after CORS & before endpoints ----
app.UseAuthentication();
app.UseAuthorization();

// ---- Hubs & Controllers ----
app.MapHub<ChatHub>("/chathub").RequireCors("AllowFrontend");
app.MapHub<RadioHub>("/radiohub").RequireCors("AllowFrontend");
app.MapControllers().RequireCors("AllowFrontend");
app.MapHealthChecks("/health").AllowAnonymous();

// Live-stream proxy (anonymous, same-origin) — matched before the SPA fallback.
app.MapReverseProxy();

app.MapGet("/404", context => ServeSpaIndex(context, StatusCodes.Status404NotFound));

var spaRoutes = new[] {
    "/",
    "/login",
    "/register",
    "/contact",
    "/net",
    "/stream",
    "/donate",
    "/tools",
    "/tools/{tool}",
    "/privacy",
    "/cookies",
    "/resume",
    "/projects",
    "/uses",
    "/colophon",
    "/blog/pages",
    "/blog/pages/{id}",
    "/gallery/images",
    "/gallery/images/{id}",
    "/settings",
    "/u/{username}",
    "/inbox",
    "/guestbook",
    "/radio",
    "/blog/upload",
    "/gallery/upload",
};

foreach (var route in spaRoutes) {
    app.MapGet(route, context => ServeSpaIndex(context, StatusCodes.Status200OK));
}

app.MapFallback(context => {
    // Unknown API routes get a plain 404 — never the SPA's HTML shell.
    if (context.Request.Path.StartsWithSegments("/api")) {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return Task.CompletedTask;
    }
    return ServeSpaIndex(context, StatusCodes.Status404NotFound);
});

app.Run();

static Task ServeSpaIndex(HttpContext context, int statusCode) {
    context.Response.StatusCode = statusCode;
    context.Response.ContentType = "text/html; charset=utf-8";

    var indexPath = Path.Combine(
        context.RequestServices.GetRequiredService<IHostEnvironment>().ContentRootPath,
        "wwwroot",
        "index.html");

    // The frontend may not be built (backend tests / CI) — return the status and
    // content-type without the SPA shell rather than throwing on a missing file.
    return File.Exists(indexPath)
        ? context.Response.SendFileAsync(indexPath)
        : Task.CompletedTask;
}

// Exposed so integration tests can boot the real app via
// WebApplicationFactory<Program>.
public partial class Program { }
