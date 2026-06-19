using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;
using Markdig;
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
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? tags = null,      // include: post must have any of these
        [FromQuery] string? notTags = null)   // exclude: post must have none of these
    {
        if (page < 1 || pageSize < 1) return BadRequest("Invalid pagination values");

        var coll = mongoDbService.GetBlogPostCollection();

        var builder = Builders<BlogPost>.Filter;
        var filter = builder.Empty;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var regex = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            filter &= builder.Or(
                builder.Regex(p => p.Title, regex),
                builder.Regex(p => p.Content, regex));
        }

        var include = SplitTags(tags);
        if (include.Count > 0) filter &= builder.AnyIn(p => p.Tags, include);

        var exclude = SplitTags(notTags);
        if (exclude.Count > 0) filter &= builder.Not(builder.AnyIn(p => p.Tags, exclude));

        var totalDocs = await coll.CountDocumentsAsync(filter);
        var totalPages = (int)Math.Ceiling(totalDocs / (double)pageSize);

        var items = await coll.Find(filter)
            .SortByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return Ok(new { items, totalPages, total = totalDocs });
    }

    /// <summary>
    /// Distinct list of every tag in use, for the filter UI.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("getTags")]
    public async Task<IActionResult> GetTags()
    {
        var tagLists = await mongoDbService.GetBlogPostCollection()
            .Find(Builders<BlogPost>.Filter.Empty)
            .Project(p => p.Tags)
            .ToListAsync();

        var tags = tagLists
            .Where(t => t != null)
            .SelectMany(t => t)
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(tags);
    }

    private static readonly Regex FrontmatterRegex = new(
        @"^﻿?---\s*\r?\n(.*?)\r?\n---\s*\r?\n?", RegexOptions.Singleline | RegexOptions.Compiled);

    /// <summary>Parse the `tags:` line from a post's leading frontmatter block.</summary>
    private static List<string> ParseTags(string? content)
    {
        var tags = new List<string>();
        if (string.IsNullOrEmpty(content)) return tags;

        var block = FrontmatterRegex.Match(content);
        if (!block.Success) return tags;

        var line = Regex.Match(block.Groups[1].Value, @"^tags\s*:\s*(.+)$", RegexOptions.Multiline);
        if (!line.Success) return tags;

        var value = line.Groups[1].Value.Trim().Trim('[', ']');
        foreach (var raw in value.Split(','))
        {
            var tag = raw.Trim().Trim('"', '\'');
            if (tag.Length > 0 && !tags.Contains(tag, StringComparer.OrdinalIgnoreCase))
                tags.Add(tag);
        }
        return tags;
    }

    /// <summary>Remove the leading frontmatter block so it isn't rendered.</summary>
    private static string StripFrontmatter(string? content)
        => string.IsNullOrEmpty(content) ? string.Empty : FrontmatterRegex.Replace(content, "");

    private static List<string> SplitTags(string? csv)
        => string.IsNullOrWhiteSpace(csv)
            ? new List<string>()
            : csv.Split(',').Select(t => t.Trim()).Where(t => t.Length > 0).ToList();

    /// <summary>
    /// RSS 2.0 feed of the most recent blog posts.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("rss")]
    public async Task<IActionResult> GetRssFeed()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        var posts = await mongoDbService.GetBlogPostCollection()
            .Find(Builders<BlogPost>.Filter.Empty)
            .SortByDescending(p => p.CreatedAt)
            .Limit(20)
            .ToListAsync();

        var markdown = new MarkdownPipelineBuilder().UseAdvancedExtensions().Build();

        using var ms = new MemoryStream();
        var settings = new XmlWriterSettings { Indent = true, Encoding = new UTF8Encoding(false) };
        using (var writer = XmlWriter.Create(ms, settings))
        {
            writer.WriteStartDocument();
            writer.WriteStartElement("rss");
            writer.WriteAttributeString("version", "2.0");
            writer.WriteAttributeString("xmlns", "atom", null, "http://www.w3.org/2005/Atom");
            writer.WriteAttributeString("xmlns", "content", null, "http://purl.org/rss/1.0/modules/content/");
            writer.WriteStartElement("channel");

            writer.WriteElementString("title", "GuildedThorn — Blog");
            writer.WriteElementString("link", $"{baseUrl}/blog/pages");
            writer.WriteElementString("description", "Latest posts from the GuildedThorn blog.");
            writer.WriteElementString("language", "en-us");
            writer.WriteElementString("lastBuildDate", DateTime.UtcNow.ToString("r"));

            writer.WriteStartElement("atom", "link", "http://www.w3.org/2005/Atom");
            writer.WriteAttributeString("href", $"{baseUrl}/api/blog/rss");
            writer.WriteAttributeString("rel", "self");
            writer.WriteAttributeString("type", "application/rss+xml");
            writer.WriteEndElement();

            foreach (var post in posts)
            {
                var url = $"{baseUrl}/blog/pages/{post.Id}";
                writer.WriteStartElement("item");
                writer.WriteElementString("title", post.Title);
                writer.WriteElementString("link", url);

                writer.WriteStartElement("guid");
                writer.WriteAttributeString("isPermaLink", "true");
                writer.WriteString(url);
                writer.WriteEndElement();

                writer.WriteElementString("pubDate", post.CreatedAt.ToUniversalTime().ToString("r"));

                // Full post body: render Markdown → HTML and absolutize root-relative
                // URLs so images/links resolve inside feed readers.
                var html = Markdown.ToHtml(StripFrontmatter(post.Content), markdown)
                    .Replace("src=\"/", $"src=\"{baseUrl}/")
                    .Replace("href=\"/", $"href=\"{baseUrl}/");

                writer.WriteStartElement("description");
                writer.WriteCData(html);
                writer.WriteEndElement();

                // Also provide the full body via content:encoded for readers that prefer it.
                writer.WriteStartElement("content", "encoded", "http://purl.org/rss/1.0/modules/content/");
                writer.WriteCData(html);
                writer.WriteEndElement();

                writer.WriteEndElement();
            }

            writer.WriteEndElement(); // channel
            writer.WriteEndElement(); // rss
            writer.WriteEndDocument();
        }

        return File(ms.ToArray(), "application/rss+xml; charset=utf-8");
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

        newPost.Tags = ParseTags(newPost.Content);
        newPost.CreatedAt = DateTime.UtcNow;

        var coll = mongoDbService.GetBlogPostCollection();
        await coll.InsertOneAsync(newPost);

        return Ok(new { message = "Post created successfully", post = newPost });
    }


    [HttpPut("{id}")]
    [Authorize(Roles = "owner")]
    public async Task<IActionResult> UpdatePost(string id, [FromBody] BlogPost updatedPost)
    {
        if (string.IsNullOrWhiteSpace(updatedPost.Title) || string.IsNullOrWhiteSpace(updatedPost.Content))
            return BadRequest("Title and Content are required");

        // Update only the editable fields via $set — this preserves Id and
        // CreatedAt (a full ReplaceOne would clobber both, since the request
        // body only carries title + content).
        var update = Builders<BlogPost>.Update
            .Set(p => p.Title, updatedPost.Title)
            .Set(p => p.Content, updatedPost.Content)
            .Set(p => p.Tags, ParseTags(updatedPost.Content))
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        var coll = mongoDbService.GetBlogPostCollection();
        var result = await coll.UpdateOneAsync(p => p.Id == id, update);
        if (result.MatchedCount == 0)
            return NotFound(new { message = "Post not found" });

        return Ok(new { message = "Post updated successfully" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "owner")]
    public async Task<IActionResult> DeletePost(string id)
    {
        var result = await mongoDbService.GetBlogPostCollection().DeleteOneAsync(p => p.Id == id);
        if (result.DeletedCount == 0)
            return NotFound(new { message = "Post not found" });

        return Ok(new { message = "Post deleted successfully" });
    }
}