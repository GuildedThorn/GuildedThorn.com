namespace GuildedThorn.com.Models;


//https://api.github.com/users/GuildedThorn
public class GithubInfo
{
    public bool Hireable { get; set; }
    public int Public_Repos { get; set; }
    public int Followers { get; set; }
    public int Following { get; set; }
}

public class GithubProject {
    public string Name { get; set; }
    public string Description { get; set; }
    public string Language { get; set; }
    public int Stars { get; set; }
    public int Forks { get; set; }
}