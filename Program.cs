using System;
using System.Text.Json;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

DotNetEnv.Env.Load(".env");

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;

// ---------- 1. Add services ----------
services.Configure<SpotifySettings>(configuration.GetSection("Spotify"));
services.AddHttpClient();
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

// ---- JWT signing key ----
var keyBytes = Convert.FromBase64String(configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT signing key is not configured."));
var key = new SymmetricSecurityKey(keyBytes);
var signingCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

services.AddHttpContextAccessor();
services.AddSingleton(key);
services.AddSingleton(signingCredentials);

// ---- CORS ----
services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
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

services.AddAuthentication(options =>
{
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = configuration["Jwt:Issuer"],
        ValidAudience            = configuration["Jwt:Audience"],
        IssuerSigningKey         = key,
        NameClaimType = "name"
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            if (ctx.Request.Cookies.TryGetValue("token", out var token))
                ctx.Token = token;
            return Task.CompletedTask;
        }
    };
})
.AddCookie("Cookies", options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
});

// ---- HttpClient for Spotify ----
services.AddHttpClient("Spotify", client =>
    client.Timeout = TimeSpan.FromSeconds(10));

// ---- OpenIddict client (kept, single config) ----
services.AddOpenIddict()
    .AddCore(_ =>
    {
        /* client-only */
    });

// ---- SignalR ----
services.AddSignalR(hubOpts =>
{
    hubOpts.EnableDetailedErrors    = true;
    hubOpts.ClientTimeoutInterval   = TimeSpan.FromMinutes(2);
})
.AddJsonProtocol(opts =>
{
    opts.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

// ---- Custom services ----
services.AddSingleton<MongoDbService>();
services.AddScoped<ChatService>();
services.AddSingleton<RadioService>();

// ---------- 2. Build the app ----------
var app = builder.Build();

// ---------- 3. Middleware ----------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowFrontend");

// Bypass auth for Spotify manual callback (so your controller handles the code exchange)
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/spotify/callback", StringComparison.OrdinalIgnoreCase))
    {
        // Don't challenge/validate JWT for this route — let the controller be reached
        await next();
        return;
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapHub<ChatHub>("/chathub")
    .RequireCors("AllowFrontend");

app.MapControllers()
    .RequireCors("AllowFrontend");

app.MapFallbackToFile("index.html");

app.Run();
