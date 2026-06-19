using System.Text.Json.Serialization;

namespace GuildedThorn.com.Models;


//https://api.github.com/users/GuildedThorn
public class GithubInfo
{
    public bool Hireable { get; set; }

    // Pin the wire name so it round-trips as `public_repos` both ways —
    // GitHub sends `public_repos`, and the SPA reads `public_repos`.
    // (Default camelCase would otherwise emit `public_Repos`.)
    [JsonPropertyName("public_repos")]
    public int PublicRepos { get; set; }

    public int Followers { get; set; }
    public int Following { get; set; }
}

public class GithubProject {
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string Language { get; set; }
    public int Stars { get; set; }
    public int Forks { get; set; }
}