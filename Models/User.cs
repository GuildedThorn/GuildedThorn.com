using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GuildedThorn.com.Models;

public class User {
    public required string Id { get; set; }     
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public string AvatarUrl { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public required string Role { get; set; }
    public required List<string> Permissions { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RegisterRequest {
    public required string Username { get; set; }
    
    public required string Password { get; set; }
}

public class LoginRequest {
    
    [Required]
    public required string Username { get; set; }
    
    [Required]
    public required string Password { get; set; }
}

public class UpdateUserRequest {
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
}