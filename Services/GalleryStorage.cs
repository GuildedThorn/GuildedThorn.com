using System.IO;

namespace GuildedThorn.com.Services;

/// <summary>
/// Resolved location of uploaded gallery images. Kept OUTSIDE wwwroot so that
/// <c>bun run build</c> (which empties wwwroot) and <c>dotnet publish</c> (which
/// overwrites it) can never nuke user uploads. The files are served back at the
/// <c>/images/gallery</c> URL by a dedicated static-files mapping in Program.cs,
/// so the public URLs are unchanged.
///
/// Configure with <c>Storage:GalleryPath</c> (absolute path recommended in
/// production, e.g. a persistent volume); defaults to <c>&lt;ContentRoot&gt;/data/gallery</c>.
/// </summary>
public sealed class GalleryStorage {
    public string RootPath { get; }

    public GalleryStorage(string rootPath) {
        RootPath = Path.GetFullPath(rootPath);
        Directory.CreateDirectory(RootPath);
    }

    /// <summary>Absolute path to the file backing a given image id + extension.</summary>
    public string PathFor(string id, string fileType) =>
        Path.Combine(RootPath, $"{id}.{fileType}");
}
