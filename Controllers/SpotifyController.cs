using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotifyController(IOptions<SpotifySettings> settings, IHttpClientFactory httpClientFactory) : ControllerBase
{
    private readonly SpotifySettings _settings = settings.Value;
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    [HttpGet("top-artists")]
    public async Task<IActionResult> GetTopArtists()
    {
        var accessToken = await GetAccessToken();
        if (accessToken is null)
            return StatusCode(500, "Failed to get Spotify access token.");

        var artists = await FetchTopArtists(accessToken);
        return artists is null
            ? StatusCode(500, "Failed to fetch top artists.")
            : Ok(artists);
    }

    private async Task<string?> GetAccessToken()
    {
        var credentials = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(
            $"{_settings.ClientId}:{_settings.ClientSecret}"));

        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "refresh_token", _settings.RefreshToken }
        });

        var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Basic", credentials) },
            Content = body
        };

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return null;

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        return json.RootElement.TryGetProperty("access_token", out var token)
            ? token.GetString()
            : null;
    }

    private async Task<List<object>?> FetchTopArtists(string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/top/artists?limit=25");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return null;

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        var artists = new List<object>();
        foreach (var item in json.RootElement.GetProperty("items").EnumerateArray())
        {
            artists.Add(new
            {
                name = item.GetProperty("name").GetString(),
                genres = item.GetProperty("genres").EnumerateArray().Select(x => x.GetString()).ToList(),
                imageUrl = item.TryGetProperty("images", out var images) && images.GetArrayLength() > 0
                    ? images[0].GetProperty("url").GetString()
                    : null
            });
        }

        return artists;
    }
}
