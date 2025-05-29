using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using Microsoft.AspNetCore.Mvc;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GithubController(IHttpClientFactory httpClientFactory) : Controller {
    
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    [HttpGet]
    [Route("/getInfo")]
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

    [HttpGet]
    [Route("/getProjects")]
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
}