using System;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OpenIddict.Client.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;

services.Configure<SpotifySettings>(configuration.GetSection("Spotify"));

services.AddHttpClient();
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

services.AddAuthentication(options => {
        options.DefaultScheme = "Cookies";
        options.DefaultChallengeScheme =
            OpenIddictClientAspNetCoreDefaults.AuthenticationScheme;
    })
    .AddCookie("Cookies"); 
services.AddOpenIddict()
    .AddCore(options => {})
    .AddClient(options => {
        options.DisableTokenStorage(); // 🔥 THIS LINE FIXES YOUR ISSUE
        options.AllowAuthorizationCodeFlow();
        options.AddDevelopmentEncryptionCertificate()
            .AddDevelopmentSigningCertificate();
        options.UseAspNetCore()
            .EnableRedirectionEndpointPassthrough();
        options.UseWebProviders()
            .AddSpotify(spotify => {
                spotify.Registration.ClientId = configuration["Spotify:ClientId"];
                spotify.Registration.ClientSecret = configuration["Spotify:ClientSecret"];
                spotify.Registration.RedirectUri = new Uri("https://localhost:7101/api/Spotify/Callback");
                spotify.Registration.Scopes.Add("user-top-read");
            });
    });
services.AddSingleton<RadioService>();

var app = builder.Build();

if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("index.html");

app.Run();