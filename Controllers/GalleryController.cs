using System;
using System.IO;
using System.Threading.Tasks;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GalleryController(MongoDbService mongoDbService) : ControllerBase {
    
    [Authorize]
    [HttpGet("getImages")]
    public async Task<IActionResult> GetGalleriesImages(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10) 
    {
        if (page < 1 || pageSize < 1) return BadRequest("Invalid pagination values");
        
        var coll = mongoDbService.GetGalleryImageCollection();
        
        var totalDocs = await coll.CountDocumentsAsync(_ => true);
        var totalPages = (int)Math.Ceiling(totalDocs / (double)pageSize);
        
        var items = await coll.Find(_ => true)
            .SortByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
        
        return Ok(new { items, totalPages });
    }
    
    [Authorize]
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
    public async Task<IActionResult> CreateImage([FromForm] IFormFile? file, [FromForm] string title, [FromForm] string description)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var newImage = new GalleryImage {
            Id = Guid.NewGuid().ToString("N"), // generate Mongo-friendly string ID
            Title = title,
            Description = description,
            FileType = Path.GetExtension(file.FileName).TrimStart('.')
        };

        // save metadata first
        var coll = mongoDbService.GetGalleryImageCollection();
        await coll.InsertOneAsync(newImage);

        // save file to disk (rename to id)
        var savePath = Path.Combine("wwwroot/images/gallery", $"{newImage.Id}.{newImage.FileType}");
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

        var filePath = Path.Combine("wwwroot/images/gallery", $"{image.Id}.{image.FileType}");

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