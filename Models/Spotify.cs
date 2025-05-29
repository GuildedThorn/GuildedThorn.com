using System.Collections.Generic;

namespace GuildedThorn.com.Models;

public class SpotifyArtist {
    public string Name { get; set; }
    public List<string> Genres { get; set; }
    public List<SpotifyImage> Images { get; set; }
}

public class SpotifyImage {
    public string Url { get; set; }
}

public class SpotifyTopArtistsResponse {
    public List<SpotifyArtist> Items { get; set; }
}


public class SpotifySettings {
    public string ClientId { get; set; }
    public string ClientSecret { get; set; }
    public string RefreshToken { get; set; }
}