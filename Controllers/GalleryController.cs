using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GalleryController(MongoDbService mongoDbService, GalleryStorage galleryStorage) : ControllerBase {
    
    [AllowAnonymous]
    [HttpGet("getImages")]
    public async Task<IActionResult> GetGalleriesImages(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? tags = null,      // include: image must have any of these
        [FromQuery] string? notTags = null)   // exclude: image must have none of these
    {
        if (page < 1 || pageSize < 1) return BadRequest("Invalid pagination values");

        var coll = mongoDbService.GetGalleryImageCollection();

        var builder = Builders<GalleryImage>.Filter;
        var filter = builder.Empty;

        if (!string.IsNullOrWhiteSpace(search))
        {
            var regex = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
            filter &= builder.Or(
                builder.Regex(p => p.Title, regex),
                builder.Regex(p => p.Description, regex));
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

    [AllowAnonymous]
    [HttpGet("getTags")]
    public async Task<IActionResult> GetTags()
    {
        var tagLists = await mongoDbService.GetGalleryImageCollection()
            .Find(Builders<GalleryImage>.Filter.Empty)
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

    private static List<string> SplitTags(string? csv)
        => string.IsNullOrWhiteSpace(csv)
            ? new List<string>()
            : csv.Split(',')
                .Select(t => t.Trim())
                .Where(t => t.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
    
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetImage(string id) {
        var coll = mongoDbService.GetGalleryImageCollection();
        
        var image = await coll.Find(p => p.Id == id).FirstOrDefaultAsync();
        if (image == null)
            return NotFound(new { message = "Image not found" });
        
        return Ok(image);
    }
    
    [HttpPost]
    [Authorize(Roles = "owner")]
    public async Task<IActionResult> CreateImage([FromForm] IFormFile? file, [FromForm] string? title = null, [FromForm] string? description = null, [FromForm] string? metadata = null, [FromForm] string? tags = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var newImage = new GalleryImage {
            Id = Guid.NewGuid().ToString("N"), // generate Mongo-friendly string ID
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Tags = SplitTags(tags),
            FileType = Path.GetExtension(file.FileName).TrimStart('.')
        };

        // EXIF / photo metadata extracted client-side and sent as a JSON object.
        if (!string.IsNullOrWhiteSpace(metadata)) {
            try {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(metadata);
                if (parsed != null) newImage.MetaData = parsed;
            }
            catch (JsonException) {
                // Ignore malformed metadata; the image still uploads.
            }
        }

        // save metadata first
        var coll = mongoDbService.GetGalleryImageCollection();
        await coll.InsertOneAsync(newImage);

        // save file to disk (rename to id), in the out-of-wwwroot store
        var savePath = galleryStorage.PathFor(newImage.Id, newImage.FileType);
        Directory.CreateDirectory(Path.GetDirectoryName(savePath)!);

        await using (var stream = new FileStream(savePath, FileMode.Create)) {
            await file.CopyToAsync(stream);
        }

        return Ok(newImage);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "owner")]
    public async Task<IActionResult> DeleteImage(string id) {
        var coll = mongoDbService.GetGalleryImageCollection();
        var image = await coll.FindOneAndDeleteAsync(p => p.Id == id);

        if (image == null)
            return NotFound(new { message = "Image not found" });

        var filePath = galleryStorage.PathFor(image.Id, image.FileType);

        try {
            if (System.IO.File.Exists(filePath)) {
                System.IO.File.Delete(filePath);
            }
        }
        catch (Exception ex) {
            // If the DB delete succeeded but file delete failed, you may want to log it.
            return StatusCode(500, new { message = "Image metadata deleted, but file deletion failed", error = ex.Message });
        }

        return Ok(new { message = "Image deleted successfully" });
    }
    
}