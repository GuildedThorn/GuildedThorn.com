using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GithubController(IHttpClientFactory httpClientFactory) : ControllerBase {
    
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    [AllowAnonymous]
    [HttpGet("getInfo")]
    public async Task<ActionResult<GithubInfo>> GetGithubInfo() {
        var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/users/GuildedThorn");
        request.Headers.UserAgent.ParseAdd("MyCoolApp/1.0");
    
        var response = await _httpClient.SendAsync(request);
    
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Failed to fetch info.");
    
        var json = await response.Content.ReadAsStringAsync();
        var info = JsonSerializer.Deserialize<GithubInfo>(json, new JsonSerializerOptions {
            PropertyNameCaseInsensitive = true
        });
    
        return Ok(info);
    }

    [AllowAnonymous]
    [HttpGet("getProjects")]
    public async Task<ActionResult<string>> GetGithubProjects() {
        var response = await _httpClient.GetAsync("https://pinned.berrysauce.dev/get/GuildedThorn");
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Failed to fetch projects.");

        var json = await response.Content.ReadAsStringAsync();
        var projects = JsonSerializer.Deserialize<List<GithubProject>>(json, new JsonSerializerOptions {
            PropertyNameCaseInsensitive = true
        });

        return Ok(projects);
    }

    // Most recently pushed-to repos, straight from the GitHub REST API
    // (the pinned API has no "recently committed" view). Same shape as
    // getProjects so the SPA can swap between the two without remapping.
    [AllowAnonymous]
    [HttpGet("getRecentProjects")]
    public async Task<ActionResult<List<GithubProject>>> GetRecentGithubProjects() {
        // Pull a wider page than we render: archived repos are filtered out
        // below, so over-fetch to still land on a full six afterwards.
        var request = new HttpRequestMessage(HttpMethod.Get,
            "https://api.github.com/users/GuildedThorn/repos?sort=pushed&direction=desc&per_page=30&type=owner");
        request.Headers.UserAgent.ParseAdd("MyCoolApp/1.0");

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Failed to fetch projects.");

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var projects = doc.RootElement.EnumerateArray()
            .Where(repo => !(repo.TryGetProperty("archived", out var a) && a.ValueKind == JsonValueKind.True))
            .Take(6)
            .Select(repo => new GithubProject {
                Name = GetString(repo, "name"),
                Description = GetString(repo, "description"),
                Language = GetString(repo, "language"),
                Stars = repo.TryGetProperty("stargazers_count", out var s) ? s.GetInt32() : 0,
                Forks = repo.TryGetProperty("forks_count", out var f) ? f.GetInt32() : 0,
            }).ToList();

        return Ok(projects);
    }

    private static string GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : string.Empty;
}