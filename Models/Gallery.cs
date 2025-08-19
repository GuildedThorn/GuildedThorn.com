using System;

namespace GuildedThorn.com.Models;

public class GalleryImage {
    
    public string Id { get; set; } = string.Empty;
    
    public string Title { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    // eg: {"Camera make": "OnePlus"}
    public string[] MetaData { get; set; } = [];
    
    public string FileType { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}