using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BlogController(MongoDbService mongoDbService) : ControllerBase
{
    /// <summary>
    /// Get paginated list of blog posts
    /// </summary>
    [AllowAnonymous]
    [HttpGet("getPosts")]
    public async Task<IActionResult> GetPosts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        if (page < 1 || pageSize < 1) return BadRequest("Invalid pagination values");

        var coll = mongoDbService.GetBlogPostCollection();

        var totalDocs = await coll.CountDocumentsAsync(_ => true);
        var totalPages = (int)Math.Ceiling(totalDocs / (double)pageSize);

        var items = await coll.Find(_ => true)
            .SortByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return Ok(new { items, totalPages });
    }

    /// <summary>
    /// Get a single blog post by ID
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(string id)
    {
        var coll = mongoDbService.GetBlogPostCollection();

        var post = await coll.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (post == null)
            return NotFound(new { message = "Post not found" });

        return Ok(post);
    }

    /// <summary>
    /// Create a new blog post
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "owner")]
    public async Task<IActionResult> CreatePost([FromBody] BlogPost newPost)
    {
        if (string.IsNullOrWhiteSpace(newPost.Title) || string.IsNullOrWhiteSpace(newPost.Content))
            return BadRequest(new { message = "Title and Content are required" });

        newPost.CreatedAt = DateTime.UtcNow;

        var coll = mongoDbService.GetBlogPostCollection();
        await coll.InsertOneAsync(newPost);

        return Ok(new { message = "Post created successfully", post = newPost });
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePost(string id, [FromBody] BlogPost updatedPost)
    {
        if (string.IsNullOrWhiteSpace(updatedPost.Title) || string.IsNullOrWhiteSpace(updatedPost.Content))
            return BadRequest("Title and Content are required");
        updatedPost.UpdatedAt = DateTime.UtcNow;
        var coll = mongoDbService.GetBlogPostCollection();
        var result = await coll.ReplaceOneAsync(p => p.Id == id, updatedPost);
        if (result.MatchedCount == 0)
            return NotFound(new { message = "Post not found" });
        return Ok(updatedPost);
    }
}