using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotifyController(IOptions<SpotifySettings> settings, IHttpClientFactory httpClientFactory) : ControllerBase {
    
    private readonly SpotifySettings _settings = settings.Value;
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    // Store tokens in-memory (demo only, use persistent store in prod)
    private static string? _accessToken;
    private static string? _refreshToken;
    private static DateTime _accessTokenExpiresAt = DateTime.MinValue;
    private static readonly SemaphoreSlim TokenSemaphore = new(1, 1);

    [HttpGet("login")]
    public IActionResult Login() {
        var scope = Uri.EscapeDataString("user-top-read user-read-email");
        var authUrl = $"https://accounts.spotify.com/authorize?client_id={_settings.ClientId}&response_type=code&redirect_uri={_settings.RedirectUri}&scope={scope}";

        return Redirect(authUrl);
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string code) {
        var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_settings.ClientId}:{_settings.ClientSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "authorization_code" },
            { "code", code },
            { "redirect_uri", _settings.RedirectUri }
        });

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Failed to get tokens from Spotify.");

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<SpotifyTokenResponse>(json);

        if (tokenResponse == null)
            return BadRequest("Invalid token response.");

        // Save tokens in-memory (replace with DB in production)
        _accessToken = tokenResponse.AccessToken;
        _refreshToken = tokenResponse.RefreshToken;
        _accessTokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 60);

        return Content("Spotify authorization successful! You can now call /api/spotify/top-artists.");
    }

    [HttpGet("top-artists")]
    public async Task<IActionResult> GetTopArtists() {
        if (string.IsNullOrEmpty(_refreshToken))
            return BadRequest("User not authorized. Please login first at /api/spotify/login");

        await TokenSemaphore.WaitAsync();
        try {
            // Refresh access token if expired or missing
            if (_accessToken == null || DateTime.UtcNow >= _accessTokenExpiresAt) {
                var newAccessToken = await RefreshAccessToken(_refreshToken);
                if (newAccessToken == null)
                    return StatusCode(500, "Failed to refresh access token.");

                _accessToken = newAccessToken.Value.token;
                _accessTokenExpiresAt = DateTime.UtcNow.AddSeconds(newAccessToken.Value.expiresIn - 60);

                if (!string.IsNullOrEmpty(newAccessToken.Value.refreshToken))
                    _refreshToken = newAccessToken.Value.refreshToken;

            }
        }
        finally {
            TokenSemaphore.Release();
        }

        var artists = await FetchTopArtists(_accessToken);
        return artists == null ? StatusCode(500, "Failed to fetch top artists from Spotify.") : Ok(artists);
    }

    private async Task<(string token, int expiresIn, string? refreshToken)?> RefreshAccessToken(string refreshToken) {
        var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_settings.ClientId}:{_settings.ClientSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "refresh_token", refreshToken }
        });

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return null;

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("access_token", out var tokenElem))
            return null;

        var accessToken = tokenElem.GetString()!;
        var expiresIn = root.GetProperty("expires_in").GetInt32();

        string? newRefreshToken = null;
        if (root.TryGetProperty("refresh_token", out var refreshTokenElem))
            newRefreshToken = refreshTokenElem.GetString();

        return (accessToken, expiresIn, newRefreshToken);
    }


    private async Task<List<object>?> FetchTopArtists(string accessToken) {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/top/artists?limit=25");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return null;

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        var artists = new List<object>();
        foreach (var item in json.RootElement.GetProperty("items").EnumerateArray()) {
            artists.Add(new {
                name = item.GetProperty("name").GetString(),
                genres = item.GetProperty("genres").EnumerateArray().Select(x => x.GetString()).ToList(),
                imageUrl = item.TryGetProperty("images", out var images) && images.GetArrayLength() > 0
                    ? images[0].GetProperty("url").GetString()
                    : null
            });
        }

        return artists;
    }

    public class SpotifyTokenResponse {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = null!;

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = null!;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = null!;

        [JsonPropertyName("scope")]
        public string Scope { get; set; } = null!;
    }
}