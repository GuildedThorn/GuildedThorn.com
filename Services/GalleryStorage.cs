using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace GuildedThorn.com.Services;

/// <summary>
/// Gallery images live in SeaweedFS (S3-compatible), not local disk — so
/// <c>bun run build</c> and <c>dotnet publish</c> (which both touch the app's
/// own working tree) can't ever reach them, let alone wipe them. Public
/// access still goes through the same <c>/images/gallery/{id}.{ext}</c> URL
/// the frontend already requests (see the MapGet proxy in Program.cs) —
/// only the backing store changed, not the API.
///
/// Configure with <c>Storage:S3BucketGallery</c> (defaults to "gallery").
/// The bucket itself isn't created here — create it once yourself.
/// </summary>
public sealed class GalleryStorage(S3StorageService storage, IConfiguration configuration) {
    private readonly string _bucket = configuration["Storage:S3BucketGallery"] ?? "gallery";

    private static string KeyFor(string id, string fileType) => $"{id}.{fileType}";

    public Task UploadAsync(string id, string fileType, Stream stream, string? contentType) =>
        storage.UploadAsync(_bucket, KeyFor(id, fileType), stream, contentType);

    public Task DeleteAsync(string id, string fileType) =>
        storage.DeleteAsync(_bucket, KeyFor(id, fileType));

    public Task<S3ObjectStream?> GetObjectAsync(string id, string fileType) =>
        storage.GetObjectAsync(_bucket, KeyFor(id, fileType));
}
