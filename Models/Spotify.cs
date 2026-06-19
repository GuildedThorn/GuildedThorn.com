using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GuildedThorn.com.Models;

public class SpotifyArtist {
    public required string Name { get; set; }
    public required List<string> Genres { get; set; }
    public required List<SpotifyImage> Images { get; set; }
}

public class SpotifyImage {
    public required string Url { get; set; }
}

public class SpotifyTopArtistsResponse {
    [Required]
    public required List<SpotifyArtist> Items { get; set; }
}


public class SpotifySettings {
    public required string ClientId { get; set; }
    public required string ClientSecret { get; set; }
    public required string RedirectUri { get; set; }

    // Long-lived refresh token. Optional: capture it once from /api/spotify/callback
    // and set Spotify:RefreshToken (env: Spotify__RefreshToken) to stay authorized
    // permanently with no interactive login.
    public string? RefreshToken { get; set; }
}