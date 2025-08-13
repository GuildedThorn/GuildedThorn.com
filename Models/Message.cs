using System.ComponentModel.DataAnnotations;

namespace GuildedThorn.com.Models;

public class Message {
    [Required]
    public required string Username { get; set; }
    
    public required string Content { get; set; }
}