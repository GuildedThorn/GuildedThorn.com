using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;

namespace GuildedThorn.com.Services;

// Thin wrapper around a self-hosted, S3-compatible object store (SeaweedFS)
// used for anything that used to be "just a file on disk" — gallery uploads,
// radio recordings. The point: none of that data lives anywhere a deploy
// (dotnet publish / bun run build, which both touch the app's own working
// tree) could ever reach, so a redeploy structurally cannot lose it.
//
// Buckets aren't created here — create them once yourself (SeaweedFS admin
// UI or `mc mb`) before pointing config at them.
//
// The actual S3 client is built lazily, on first real use, rather than in
// the constructor. RadioSourceListener (which depends on this) is registered
// via AddHostedService, so its constructor — and everything it depends on —
// runs at host startup, before the app can serve a single request. A missing
// or typo'd Storage:S3* config value throwing there would take the entire
// site down at boot, not just degrade radio recording/gallery uploads.
// Deferring construction means that failure surfaces only where it's used
// (RadioSourceListener already isolates recording failures so they don't
// kill the live broadcast; a gallery upload/delete failing is just that one
// HTTP request 500ing, not the whole process refusing to start).
public class S3StorageService {
    private readonly IConfiguration _configuration;
    private readonly Lazy<IAmazonS3> _client;
    private readonly Lazy<TransferUtility> _transferUtility;

    public S3StorageService(IConfiguration configuration) {
        _configuration = configuration;
        _client = new Lazy<IAmazonS3>(CreateClient);
        _transferUtility = new Lazy<TransferUtility>(() => new TransferUtility(_client.Value));
    }

    private IAmazonS3 CreateClient() {
        var config = new AmazonS3Config {
            ServiceURL = _configuration["Storage:S3Endpoint"]
                ?? throw new InvalidOperationException("Storage:S3Endpoint not configured."),
            ForcePathStyle = true,
            AuthenticationRegion = _configuration["Storage:S3Region"] ?? "us-east-1",
        };

        return new AmazonS3Client(
            _configuration["Storage:S3AccessKey"] ?? throw new InvalidOperationException("Storage:S3AccessKey not configured."),
            _configuration["Storage:S3SecretKey"] ?? throw new InvalidOperationException("Storage:S3SecretKey not configured."),
            config);
    }

    public Task UploadAsync(string bucket, string key, Stream stream, string? contentType) =>
        _transferUtility.Value.UploadAsync(new TransferUtilityUploadRequest {
            BucketName = bucket,
            Key = key,
            InputStream = stream,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            AutoCloseStream = false,
        });

    // For content assembled to a local temp file first (e.g. a live radio
    // broadcast) rather than already held as a Stream. TransferUtility
    // multiparts large files automatically.
    public Task UploadFileAsync(string bucket, string key, string filePath, string? contentType) =>
        _transferUtility.Value.UploadAsync(new TransferUtilityUploadRequest {
            BucketName = bucket,
            Key = key,
            FilePath = filePath,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
        });

    public async Task DeleteAsync(string bucket, string key) {
        try {
            await _client.Value.DeleteObjectAsync(bucket, key);
        } catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound) {
            // already gone
        }
    }

    // SeaweedFS only resolves/is reachable on the LAN (see truenas.guildedthorn.arpa),
    // so a presigned URL handed to a public client's own browser/LavaLink is a dead
    // link off-network. Fetch the bytes here instead and let callers stream them back
    // over the connection the client already has open — the app is the only thing
    // that needs LAN access to SeaweedFS.
    //
    // rangeHeader is the client's raw incoming "Range" header (e.g. "bytes=500-999"
    // or the open-ended/suffix forms), forwarded to S3 as-is rather than parsed here.
    public async Task<S3ObjectStream?> GetObjectAsync(string bucket, string key, string? rangeHeader = null) {
        var request = new GetObjectRequest { BucketName = bucket, Key = key };
        if (!string.IsNullOrEmpty(rangeHeader)) request.ByteRange = new ByteRange(rangeHeader);

        try {
            var response = await _client.Value.GetObjectAsync(request);
            return new S3ObjectStream(
                response.ResponseStream,
                string.IsNullOrWhiteSpace(response.Headers.ContentType) ? "application/octet-stream" : response.Headers.ContentType,
                response.ContentLength,
                response.ContentRange,
                response.HttpStatusCode == HttpStatusCode.PartialContent);
        } catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound) {
            return null;
        }
    }
}

public sealed class S3ObjectStream(Stream content, string contentType, long contentLength, string? contentRange, bool isPartial) : IDisposable {
    public Stream Content { get; } = content;
    public string ContentType { get; } = contentType;
    public long ContentLength { get; } = contentLength;
    public string? ContentRange { get; } = contentRange;
    public bool IsPartial { get; } = isPartial;

    public void Dispose() => Content.Dispose();
}
